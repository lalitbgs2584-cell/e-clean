import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../config/env";

const client = new S3Client({
    region: config.s3Region,
    credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey
    }
})

export default client