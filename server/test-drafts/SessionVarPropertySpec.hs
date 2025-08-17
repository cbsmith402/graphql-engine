{-# LANGUAGE StandaloneDeriving #-}

-- | Property-based tests for session variable operators using QuickCheck.
module Hasura.RQL.IR.BoolExp.SessionVarPropertySpec (spec) where

import Data.Aeson (Value (..), Array, toJSON, fromJSON)
import Data.Aeson qualified as A
import Data.List (nub)
import Data.Text (Text)
import Hasura.Prelude
import Hasura.RQL.IR.BoolExp (GBoolExp(..), SessionVarCondition(..), SessionVarOperator(..), ColExp(..))
import Hasura.Authentication.Session (SessionVariable, unsafeMkSessionVariable)
import Hasura.RQL.Types.BackendType (BackendType (Postgres), PostgresKind (Vanilla))
import Hasura.Backends.Postgres.Instances.Schema ()
import Test.Hspec
import Test.QuickCheck
import qualified Data.Vector as Vector

type PG = 'Postgres 'Vanilla

-- Simplified Arbitrary instances for testing
instance Arbitrary SessionVarOperator where
  arbitrary = elements [SVOEquals, SVONotEquals, SVOContains, SVOIn]

instance Arbitrary SessionVariable where
  arbitrary = do
    name <- elements ["X-Hasura-User-Id", "X-Hasura-Role", "X-Hasura-Permissions"]
    pure $ unsafeMkSessionVariable (name :: Text)

-- Generate simple JSON values for testing
genSimpleValue :: Gen Value
genSimpleValue = oneof
  [ String <$> arbitrary
  , Bool <$> arbitrary
  , Array . Vector.fromList <$> listOf (String <$> arbitrary)
  ]

instance Arbitrary SessionVarCondition where
  arbitrary = SessionVarCondition
    <$> arbitrary
    <*> arbitrary
    <*> genSimpleValue

spec :: Spec
spec = do
  describe "Session Variable Operators Property Tests" $ do
    describe "JSON Serialization Properties" $ do
      it "JSON serialization is reversible" $ property $ \(condition :: SessionVarCondition) ->
        let boolExp = BoolSessionVar condition :: GBoolExp PG ColExp
            json = toJSON boolExp
            result = fromJSON json :: A.Result (GBoolExp PG ColExp)
        in case result of
             A.Success parsed -> parsed === boolExp
             A.Error _ -> property False

    describe "SessionVarCondition Properties" $ do
      it "Eq instance is reflexive" $ property $ \(condition :: SessionVarCondition) ->
        condition === condition

      it "Show instance produces non-empty strings" $ property $ \(condition :: SessionVarCondition) ->
        not (null (show condition))

    describe "SessionVarOperator Properties" $ do
      it "All operators have distinct string representations" $ 
        let operators = [SVOEquals, SVONotEquals, SVOContains, SVOIn]
            shown = map show operators
        in length shown === length (nub shown)