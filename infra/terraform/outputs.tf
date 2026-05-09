output "namespace" {
  value       = data.oci_objectstorage_namespace.ns.namespace
  description = "Object Storage namespace. Set as the OCI_BUCKET_NAMESPACE GitHub secret."
}

output "bucket_name" {
  value       = oci_objectstorage_bucket.site.name
  description = "Bucket name. Set as the OCI_BUCKET_NAME GitHub secret."
}

output "deploy_user_ocid" {
  value       = oci_identity_user.deploy.id
  description = "OCID of the deploy user. Set as OCI_USER_OCID after generating its API key."
}

output "deploy_user_name" {
  value       = oci_identity_user.deploy.name
  description = "Console name of the deploy user. Use this to generate its API key."
}

output "compartment_ocid" {
  value       = oci_identity_compartment.picasso.id
  description = "Compartment OCID."
}

output "object_storage_url_prefix" {
  value       = "https://objectstorage.${var.region}.oraclecloud.com/n/${data.oci_objectstorage_namespace.ns.namespace}/b/${oci_objectstorage_bucket.site.name}/o/"
  description = "Direct URL prefix for objects. Point Cloudflare's origin (or fetch) at this."
}
