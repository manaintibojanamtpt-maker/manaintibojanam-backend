output "service_account_emails" {
  value = { for k, v in google_service_account.accounts : k => v.email }
}
