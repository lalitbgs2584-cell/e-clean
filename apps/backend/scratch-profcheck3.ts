import {
  CopyObjectCommand,
  GetObjectAclCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.S3_BUCKET!;

const src = "profile/cmt1pb1mh00003wv5j82og59u/avatar-137470ce-903e-477e-8fca-c0be4814cd6b.jpg";

try {
  const acl = await client.send(new GetObjectAclCommand({ Bucket: bucket, Key: src }));
  console.log("ACL:", JSON.stringify(acl.Grants));
} catch (e: any) {
  console.log("GetObjectAcl denied:", e.$metadata?.httpStatusCode, e.name);
}

for (const key of [src, `profiles/_copy_test.jpg`]) {
  try {
    const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buf = await got.Body?.transformToByteArray();
    console.log("GET OK:", key, "len=", buf?.length);
  } catch (e: any) {
    console.log("GET FAIL:", key, "->", e.$metadata?.httpStatusCode, e.name);
  }
}

try {
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${src}`,
      Key: `profiles/_copy_test.jpg`,
    }),
  );
  console.log("COPY to profiles/_copy_test.jpg OK");
} catch (e: any) {
  console.log("COPY FAIL:", e.$metadata?.httpStatusCode, e.name, e.message?.slice(0, 200));
}

for (let i = 0; i < 3; i += 1) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: src }));
    console.log(`HEAD try#${i}:`, "OK len=", head.ContentLength);
  } catch (e: any) {
    console.log(`HEAD try#${i}:`, e.$metadata?.httpStatusCode);
  }
}
