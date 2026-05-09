# Object Storage namespace is per-tenancy and immutable; look it up
# rather than hard-coding it.
data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.tenancy_ocid
}

resource "oci_objectstorage_bucket" "site" {
  compartment_id = oci_identity_compartment.picasso.id
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = var.bucket_name

  # Public-read so Cloudflare (or anyone) can fetch objects directly.
  # ObjectReadWithoutList still allows GETs but blocks bucket-level
  # listing, which prevents random visitors from enumerating contents.
  access_type = "ObjectReadWithoutList"

  storage_tier = "Standard"

  # Versioning multiplies storage against the 20 GiB Always-Free cap;
  # off unless you specifically need rollback.
  versioning = "Disabled"

  # Auto-tiering moves cold objects to Infrequent Access (paid).
  # Explicitly off — site assets get hit on every visit.
  auto_tiering = "Disabled"
}

# Aborts incomplete multipart uploads after one day so a flaky deploy
# can't silently consume bucket quota.
#
# `depends_on` is explicit because lifecycle rules are run by the
# Object Storage service principal — without the matching policy in
# place first, PutObjectLifecyclePolicy returns
# InsufficientServicePermissions.
resource "oci_objectstorage_object_lifecycle_policy" "cleanup" {
  bucket    = oci_objectstorage_bucket.site.name
  namespace = data.oci_objectstorage_namespace.ns.namespace

  rules {
    name        = "abort-incomplete-multipart"
    action      = "ABORT"
    is_enabled  = true
    target      = "multipart-uploads"
    time_amount = 1
    time_unit   = "DAYS"
  }

  depends_on = [oci_identity_policy.objectstorage_service]
}
