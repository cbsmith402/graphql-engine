{-# LANGUAGE QuasiQuotes #-}
{-# LANGUAGE OverloadedStrings #-}
{-# OPTIONS_GHC -Wno-unused-imports #-}

-- | This module tests the session variable operators in boolean expressions.
module Hasura.RQL.IR.BoolExp.SessionVarSpec (spec) where

import Data.Aeson (Value (..), fromJSON, toJSON, Result(..))
import Data.Aeson.QQ (aesonQQ)
import Data.Text (Text)
import Hasura.Prelude
import Hasura.RQL.IR.BoolExp (GBoolExp(..), SessionVarCondition(..), SessionVarOperator(..), ColExp(..))
import Hasura.Authentication.Session (unsafeMkSessionVariable)
import Hasura.RQL.Types.BackendType (BackendType (Postgres), PostgresKind (Vanilla))
import Hasura.Backends.Postgres.Instances.Schema ()
import Test.Hspec
import qualified Data.Vector as Vector

type PG = 'Postgres 'Vanilla

spec :: Spec
spec = do
  describe "Session Variable Operators" $ do
    describe "JSON Parsing" $ do
      it "parses _seq operator correctly" $ do
        let json = [aesonQQ|{"_seq": {"var": "X-Hasura-User-Id", "value": "123"}}|]
        let result = fromJSON json :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolSessionVar condition]) -> do
            svcOperator condition `shouldBe` SVOEquals
            svcVariable condition `shouldBe` unsafeMkSessionVariable ("X-Hasura-User-Id" :: Text)
            svcValue condition `shouldBe` String "123"
          _ -> expectationFailure $ "Failed to parse _seq: " <> show result

      it "parses _sne operator correctly" $ do
        let json = [aesonQQ|{"_sne": {"var": "X-Hasura-Role", "value": "admin"}}|]
        let result = fromJSON json :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolSessionVar condition]) -> do
            svcOperator condition `shouldBe` SVONotEquals
            svcVariable condition `shouldBe` unsafeMkSessionVariable ("X-Hasura-Role" :: Text)
            svcValue condition `shouldBe` String "admin"
          _ -> expectationFailure $ "Failed to parse _sne: " <> show result

      it "parses _scontains operator correctly" $ do
        let json = [aesonQQ|{"_scontains": {"var": "X-Hasura-Permissions", "value": "view:projects"}}|]
        let result = fromJSON json :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolSessionVar condition]) -> do
            svcOperator condition `shouldBe` SVOContains
            svcVariable condition `shouldBe` unsafeMkSessionVariable ("X-Hasura-Permissions" :: Text)
            svcValue condition `shouldBe` String "view:projects"
          _ -> expectationFailure $ "Failed to parse _scontains: " <> show result

      it "parses _sin operator correctly" $ do
        let json = [aesonQQ|{"_sin": {"var": "X-Hasura-Groups", "value": ["admin", "editor"]}}|]
        let result = fromJSON json :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolSessionVar condition]) -> do
            svcOperator condition `shouldBe` SVOIn
            svcVariable condition `shouldBe` unsafeMkSessionVariable ("X-Hasura-Groups" :: Text)
            svcValue condition `shouldBe` Array (Vector.fromList ["admin", "editor"])
          _ -> expectationFailure $ "Failed to parse _sin: " <> show result

    describe "JSON Serialization" $ do
      it "serializes _seq operator correctly" $ do
        let condition = SessionVarCondition SVOEquals (unsafeMkSessionVariable ("X-Hasura-User-Id" :: Text)) (String "123")
        let boolExp = BoolSessionVar condition :: GBoolExp PG ColExp
        let json = toJSON boolExp
        let expected = [aesonQQ|{"_seq": {"var": "X-Hasura-User-Id", "value": "123"}}|]
        json `shouldBe` expected

    describe "SessionVarOperator Show instances" $ do
      it "shows operators correctly" $ do
        show SVOEquals `shouldBe` "SVOEquals"
        show SVONotEquals `shouldBe` "SVONotEquals"
        show SVOContains `shouldBe` "SVOContains"
        show SVOIn `shouldBe` "SVOIn"