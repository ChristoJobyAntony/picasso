# Dedicated compartment for everything this project owns. Lets you
# delete the project cleanly, see all spending in one place, and gives
# the deploy user a tight blast radius.
resource "oci_identity_compartment" "picasso" {
  compartment_id = var.tenancy_ocid
  name           = var.project_name
  description    = "Static-site hosting for ${var.github_repo}."
  enable_delete  = true
}

# CI deploy user. Locked down to publishing this one bucket.
resource "oci_identity_user" "deploy" {
  compartment_id = var.tenancy_ocid
  name           = "${var.project_name}-deploy"
  description    = "GitHub Actions deploy user for ${var.github_repo}."
  email          = var.notification_email
}

resource "oci_identity_group" "deployers" {
  compartment_id = var.tenancy_ocid
  name           = "${var.project_name}-deployers"
  description    = "Bucket-publishers for ${var.project_name}."
}

resource "oci_identity_user_group_membership" "deploy" {
  user_id  = oci_identity_user.deploy.id
  group_id = oci_identity_group.deployers.id
}

# Policy attached at the project compartment. The `where` clause pins
# permissions to this single bucket — the deploy user cannot touch any
# other bucket, even one created later in the same compartment.
resource "oci_identity_policy" "deployers" {
  compartment_id = oci_identity_compartment.picasso.id
  name           = "${var.project_name}-deployers-policy"
  description    = "Object access for the ${var.project_name}-deployers group, scoped to the ${var.bucket_name} bucket."

  statements = [
    "Allow group ${oci_identity_group.deployers.name} to read buckets in compartment ${oci_identity_compartment.picasso.name} where target.bucket.name = '${var.bucket_name}'",
    "Allow group ${oci_identity_group.deployers.name} to manage objects in compartment ${oci_identity_compartment.picasso.name} where target.bucket.name = '${var.bucket_name}'",
  ]
}

# Lifecycle rules are executed by the Object Storage service principal,
# not by you. Without this grant, PutObjectLifecyclePolicy itself fails
# with InsufficientServicePermissions even before the rule runs.
# The service principal name is region-scoped.
resource "oci_identity_policy" "objectstorage_service" {
  compartment_id = oci_identity_compartment.picasso.id
  name           = "${var.project_name}-objectstorage-service-policy"
  description    = "Lets the Object Storage service principal execute lifecycle rules on the ${var.bucket_name} bucket."

  statements = [
    "Allow service objectstorage-${var.region} to manage object-family in compartment ${oci_identity_compartment.picasso.name} where target.bucket.name = '${var.bucket_name}'",
  ]
}
