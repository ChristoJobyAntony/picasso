# --- Cloudflare credentials --------------------------------------------

variable "cloudflare_api_token" {
  description = "Cloudflare API token. Needs Account.Cloudflare Pages:Edit, Zone.DNS:Edit, and Zone.Zone:Read on the target account/zone."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (right sidebar of any zone overview, or `Account ID` under Workers & Pages)."
  type        = string
}

variable "cloudflare_zone_name" {
  description = "Cloudflare zone (apex domain) hosting the site, e.g. 'christojobyantony.me'. Used to build the site hostname."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID (right sidebar of the zone overview page). Passed directly to avoid needing Zone:Zone:Read on the API token."
  type        = string
}

variable "site_subdomain" {
  description = "Subdomain to expose the site at — e.g. 'picasso' produces picasso.<zone>. Set to '@' for apex."
  type        = string
  default     = "picasso"
}

# --- GitHub source repo -------------------------------------------------

variable "github_owner" {
  description = "GitHub user/org that owns the repo Cloudflare Pages builds from."
  type        = string
  default     = "ChristoJobyAntony"
}

variable "github_repo_name" {
  description = "Repo name (without owner) Cloudflare Pages builds from."
  type        = string
  default     = "picasso"
}

variable "production_branch" {
  description = "Branch that triggers production deployments. All other branches build as previews unless previews are disabled."
  type        = string
  default     = "master"
}

# --- Project knobs ------------------------------------------------------

variable "project_name" {
  description = "Cloudflare Pages project name. Becomes <name>.pages.dev."
  type        = string
  default     = "picasso"
}

# --- Build-time env vars ------------------------------------------------

variable "inference_max_dimension" {
  description = "Long-edge cap (px) the in-browser TF.js model resizes content to before inference. Lower = faster + less memory; higher = more detail. Baked into the bundle by Vite at build time, so changing it triggers a fresh Pages deploy."
  type        = number
  default     = 512

  validation {
    condition     = var.inference_max_dimension >= 256 && var.inference_max_dimension <= 1024
    error_message = "inference_max_dimension must be between 256 and 1024 — below that loses too much detail, above that risks WebGL texture limits on mobile."
  }
}
