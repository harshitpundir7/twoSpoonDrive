import { S3Client } from "@aws-sdk/client-s3"

// Initialize S3 client with credentials from environment variables
// In production, use IAM roles instead of access keys
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Use IAM role if credentials not provided
})

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || ""

if (!S3_BUCKET_NAME) {
  console.warn("⚠️  AWS_S3_BUCKET_NAME is not set. S3 operations will fail.")
}

// Generate opaque S3 key for files (security best practice)
export function generateS3Key(userId: string, fileId: string, extension?: string): string {
  // Format: files/{userId}/{fileId}{extension}
  // This prevents filename collisions and makes keys opaque
  const ext = extension ? `.${extension.replace(/^\./, "")}` : ""
  return `files/${userId}/${fileId}${ext}`
}

// Extract file extension from filename
export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

