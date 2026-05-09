# The bootstrap user (your admin) runs `terraform apply` once to create the
# project compartment, the deploy user, and the bucket. After that the
# deploy user takes over via GitHub Actions and never needs to touch
# terraform again.
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.bootstrap_user_ocid
  fingerprint      = var.bootstrap_fingerprint
  private_key_path = var.bootstrap_private_key_path
  region           = var.region
}
