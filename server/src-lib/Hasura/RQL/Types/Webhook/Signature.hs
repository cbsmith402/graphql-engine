module Hasura.RQL.Types.Webhook.Signature
  ( generateSignature,
    signatureHeaderName,
  )
where

import Crypto.Hash qualified as Crypto
import Crypto.MAC.HMAC qualified as HMAC
import Data.ByteArray (convert)
import Data.ByteString qualified as BS
import Data.ByteString.Base16 qualified as Base16
import Data.Text.Encoding qualified as TE
import Hasura.Prelude

-- | HMAC-SHA256 signature for a webhook payload, hex-encoded with a
-- "sha256=" prefix so receivers can pick the algorithm out of the header.
generateSignature :: Text -> BS.ByteString -> Text
generateSignature secret payload =
  let secretBytes = TE.encodeUtf8 secret
      hmac = HMAC.hmac secretBytes payload :: HMAC.HMAC Crypto.SHA256
      hexDigest = Base16.encode (convert hmac)
   in "sha256=" <> TE.decodeUtf8 hexDigest

signatureHeaderName :: Text
signatureHeaderName = "X-Hasura-Signature"
