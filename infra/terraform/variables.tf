# --- Bootstrap user (you, running terraform apply) ----------------------
# These come from your existing OCI admin user. Generate the API key
# pair via `oci setup keys` if you don't have one.

variable "tenancy_ocid" {
  description = "OCI tenancy OCID. From: Console > Profile > Tenancy."
  type        = string
}

variable "bootstrap_user_ocid" {
  description = "OCID of the OCI admin user running terraform apply."
  type        = string
}

variable "bootstrap_fingerprint" {
  description = "Fingerprint of the API key for the bootstrap user."
  type        = string
}

variable "bootstrap_private_key_path" {
  description = "Path to the PEM private key for the bootstrap user."
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI region key. Must be your home region for Always Free resources."
  type        = string
  default     = "ap-sydney-1"
}

# --- Project knobs --------------------------------------------------------

variable "project_name" {
  description = "Short identifier baked into resource names."
  type        = string
  default     = "picasso"
}

variable "bucket_name" {
  description = "Object Storage bucket name. Must be unique within the namespace."
  type        = string
  default     = "picasso"
}

variable "github_repo" {
  description = "owner/repo of the GitHub repository, recorded on the deploy user for documentation."
  type        = string
  default     = "ChristoJobyAntony/picasso"
}

# --- Budget guardrails ----------------------------------------------------

variable "notification_email" {
  description = "Email address to receive budget alerts."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly soft cap for budget alerts. Always-Free resources cost zero, so any actual spend means you've exited the free tier."
  type        = number
  default     = 1
}
