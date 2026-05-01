{-# LANGUAGE QuasiQuotes #-}
{-# OPTIONS_GHC -Wno-unused-imports #-}

-- | Integration tests for session variable operators in real permission scenarios.
module Hasura.RQL.IR.BoolExp.SessionVarIntegrationSpec (spec) where

import Data.Aeson (Value (..), fromJSON, toJSON, Result(..))
import Data.Aeson qualified as J
import Data.Aeson.QQ (aesonQQ)
import Data.Text (Text) -- Used for type annotations
import Hasura.Prelude
import Hasura.RQL.IR.BoolExp (GBoolExp(..), SessionVarCondition(..), SessionVarOperator(..), ColExp(..))
import Hasura.Authentication.Session (unsafeMkSessionVariable)
import Hasura.RQL.Types.BackendType (BackendType (Postgres), PostgresKind (Vanilla))
import Hasura.Backends.Postgres.Instances.Schema ()
import Test.Hspec

type PG = 'Postgres 'Vanilla

spec :: Spec
spec = do
  describe "Session Variable Operators Integration" $ do
    describe "Real-world permission scenarios" $ do
      it "supports user isolation with _seq" $ do
        let permissionJson = [aesonQQ|{
          "_seq": {
            "var": "X-Hasura-User-Id", 
            "value": "user-123"
          }
        }|]
        let result = fromJSON permissionJson :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolSessionVar condition]) -> do
            svcOperator condition `shouldBe` SVOEquals
            svcVariable condition `shouldBe` unsafeMkSessionVariable ("X-Hasura-User-Id" :: Text)
            svcValue condition `shouldBe` String "user-123"
          _ -> expectationFailure $ "Failed to parse user isolation permission: " <> show result

      it "supports role-based access with _sne" $ do
        let permissionJson = [aesonQQ|{
          "_sne": {
            "var": "X-Hasura-Role", 
            "value": "guest"
          }
        }|]
        let result = fromJSON permissionJson :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolSessionVar condition]) -> do
            svcOperator condition `shouldBe` SVONotEquals
            svcVariable condition `shouldBe` unsafeMkSessionVariable ("X-Hasura-Role" :: Text)
            svcValue condition `shouldBe` String "guest"
          _ -> expectationFailure $ "Failed to parse role exclusion permission: " <> show result

      it "supports complex permission combinations" $ do
        let permissionJson = [aesonQQ|{
          "_or": [
            {"_seq": {"var": "X-Hasura-User-Id", "value": "user-123"}},
            {"_scontains": {"var": "X-Hasura-Permissions", "value": "admin"}}
          ]
        }|]
        let result = fromJSON permissionJson :: Result (GBoolExp PG ColExp)
        case result of
          Success (BoolAnd [BoolOr conditions]) -> do
            length conditions `shouldBe` 2
            case conditions of
              [BoolAnd [BoolSessionVar userCond], BoolAnd [BoolSessionVar adminCond]] -> do
                svcOperator userCond `shouldBe` SVOEquals
                svcOperator adminCond `shouldBe` SVOContains
              _ -> expectationFailure $ "Unexpected condition structure: " <> show conditions
          _ -> expectationFailure $ "Failed to parse complex permission: " <> show result

    describe "Serialization round-trip" $ do
      it "maintains structure through JSON round-trip" $ do
        let originalCondition = SessionVarCondition SVOEquals (unsafeMkSessionVariable ("X-Hasura-User-Id" :: Text)) (String "123")
        let originalBoolExp = BoolAnd [BoolSessionVar originalCondition] :: GBoolExp PG ColExp
        
        let json = toJSON originalBoolExp
        let result = fromJSON json :: Result (GBoolExp PG ColExp)
        
        case result of
          Success roundTripBoolExp -> roundTripBoolExp `shouldBe` originalBoolExp
          J.Error err -> expectationFailure $ "Round-trip failed: " <> err