output "pages_subdomain" {
  value       = cloudflare_pages_project.site.subdomain
  description = "Cloudflare-issued <project>.pages.dev URL. Always available and the canonical fallback."
}

output "site_url" {
  value       = "https://${local.site_hostname}/"
  description = "Public URL of the deployed site once the custom domain is provisioned and DNS propagates (usually <1 min)."
}
