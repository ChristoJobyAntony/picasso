# Cloudflare Pages project. Pages clones the GitHub repo on every push
# to the production branch, runs the build, and deploys the output to
# Cloudflare's edge network. No GitHub Actions workflow needed; the
# integration is push-driven by Cloudflare's GitHub App.
#
# Prerequisite (one-time, manual): install the Cloudflare Pages GitHub
# App on the target repo from
# https://dash.cloudflare.com/<account>/pages → Connect to Git.
# Without this, project creation fails with an authorization error.

locals {
  site_hostname = var.site_subdomain == "@" ? var.cloudflare_zone_name : "${var.site_subdomain}.${var.cloudflare_zone_name}"
}

resource "cloudflare_pages_project" "site" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch

  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo_name
      production_branch             = var.production_branch
      deployments_enabled           = true
      production_deployment_enabled = true
      # No PR previews — saves build minutes and avoids leaking
      # unfinished work behind opaque <hash>.<project>.pages.dev URLs.
      preview_deployment_setting = "none"
      pr_comments_enabled        = false
    }
  }

  build_config {
    build_command   = "cd app && npm ci && npm run build"
    destination_dir = "app/build"
    root_dir        = ""
  }

  deployment_configs {
    production {
      # Match what vite.config.ts expects. NODE_VERSION pins Pages'
      # build container; the default has historically been a stale
      # Node.
      environment_variables = {
        PICASSO_BASE_PATH               = "/"
        PICASSO_INFERENCE_MAX_DIMENSION = "512"
        NODE_VERSION                    = "20"
      }
    }
    preview {
      environment_variables = {
        PICASSO_BASE_PATH               = "/"
        PICASSO_INFERENCE_MAX_DIMENSION = "512"
        NODE_VERSION                    = "20"
      }
    }
  }
}

# Register the custom hostname with the Pages project. Without this,
# Pages serves the site only at <project>.pages.dev.
resource "cloudflare_pages_domain" "site" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.site.name
  domain       = local.site_hostname
}

# DNS CNAME so the custom hostname actually resolves to the Pages
# project. Proxied so Cloudflare terminates TLS and serves visitors
# from its edge.
resource "cloudflare_record" "site" {
  zone_id = var.cloudflare_zone_id
  name    = var.site_subdomain
  type    = "CNAME"
  content = cloudflare_pages_project.site.subdomain
  proxied = true
  ttl     = 1 # 1 means "automatic" when proxied
  comment = "Picasso site → Cloudflare Pages."
}
