{-# LANGUAGE DeriveAnyClass #-}

module Hasura.RQL.Types.Webhook.Signature
  ( -- * Types
    WebhookSignature (..),
    SignatureAlgorithm (..),
    
    -- * Signature generation
    generateSignature,
    signatureHeaderName,
    
    -- * Utilities
    isSignatureEnabled,
  )
where

import Autodocodec (HasCodec, dimapCodec, literalTextCodec)
import Autodocodec qualified as AC
import Crypto.Hash qualified as Crypto
import Crypto.MAC.HMAC qualified as HMAC
import Data.Aeson (FromJSON, ToJSON)
import Data.ByteArray (convert)
import Data.ByteString qualified as BS
import Data.ByteString.Base16 qualified as Base16
import Data.Text.Encoding qualified as TE
import Hasura.Prelude

-- | Webhook signature configuration
data WebhookSignature = WebhookSignature
  { wsEnabled :: Bool
  }
  deriving stock (Show, Eq, Generic)
  deriving anyclass (NFData, FromJSON, ToJSON)

instance HasCodec WebhookSignature where
  codec = AC.object "WebhookSignature" $
    WebhookSignature
      <$> AC.optionalFieldWithDefault "enabled" False "Whether webhook signature is enabled"
      AC..= wsEnabled

-- | Signature algorithm used for webhook signatures
data SignatureAlgorithm = HMAC_SHA256
  deriving stock (Show, Eq, Generic)
  deriving anyclass (NFData, FromJSON, ToJSON)

instance HasCodec SignatureAlgorithm where
  codec = dimapCodec
    (\case "sha256" -> HMAC_SHA256; _ -> HMAC_SHA256)
    (\case HMAC_SHA256 -> "sha256")
    (literalTextCodec "sha256")

-- | Generate HMAC-SHA256 signature for webhook payload
generateSignature :: Text -> BS.ByteString -> Text
generateSignature secret payload =
  let secretBytes = TE.encodeUtf8 secret
      hmac = HMAC.hmac secretBytes payload :: HMAC.HMAC Crypto.SHA256
      hexDigest = Base16.encode (convert hmac)
   in "sha256=" <> TE.decodeUtf8 hexDigest

-- | Header name for webhook signature
signatureHeaderName :: Text
signatureHeaderName = "X-Hasura-Signature"

-- | Check if signature is enabled
isSignatureEnabled :: WebhookSignature -> Bool
isSignatureEnabled = wsEnabled