# Cloudflare hosts the site (Pages), terminates TLS, and serves the
# custom domain. No other cloud is involved — Pages clones the GitHub
# repo, runs the build, and serves the output from its edge.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
