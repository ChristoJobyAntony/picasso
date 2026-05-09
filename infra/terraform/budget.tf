# OCI does not enforce hard spending caps — the only safety net is
# alerts. Combined with the policy of using only Always-Free resources,
# this means any actual spend trips an immediate email.
resource "oci_budget_budget" "picasso" {
  compartment_id = var.tenancy_ocid

  amount       = var.monthly_budget_usd
  reset_period = "MONTHLY"

  display_name = "${var.project_name}-budget"
  description  = "Monthly budget for the ${var.project_name} compartment."

  target_type = "COMPARTMENT"
  targets     = [oci_identity_compartment.picasso.id]
}

# 1% of the budget — the smallest threshold the OCI Budgets API
# accepts. With a $1 budget that's $0.01, effectively "anything spent."
resource "oci_budget_alert_rule" "any_spend" {
  budget_id = oci_budget_budget.picasso.id

  display_name   = "any-spend"
  description    = "Email when any actual spend hits the project compartment."
  threshold      = 1
  threshold_type = "PERCENTAGE"
  type           = "ACTUAL"
  recipients     = var.notification_email
  message        = "Picasso compartment incurred a chargeable cost. Check what left the always-free tier."
}

resource "oci_budget_alert_rule" "forecast_exceed" {
  budget_id = oci_budget_budget.picasso.id

  display_name   = "forecast-exceed"
  description    = "Email if forecast monthly spend will exceed the budget cap."
  threshold      = 100
  threshold_type = "PERCENTAGE"
  type           = "FORECAST"
  recipients     = var.notification_email
  message        = "Picasso compartment is forecast to exceed $${var.monthly_budget_usd}/mo."
}
