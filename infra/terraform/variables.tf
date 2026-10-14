variable "environment_name" {
  description = "Environment name. Added to the tags of every created resource."
  type        = string
}

variable "deploy_foundry_project" {
  description = "Create the Foundry project under the reused Foundry account."
  type        = bool
}

variable "tags" {
  description = "Tags applied to every created resource."
  type        = map(string)
  default     = {}
}
