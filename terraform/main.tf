terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

variable "AWS_REGION" {
  type = string
}

variable "AWS_ACCESS_KEY_ID" {
  type = string
}

variable "AWS_SECRET_ACCESS_KEY" {
  type = string
}

variable "AWS_ENDPOINT_URL_SNS" {
  type = string
}

variable "AWS_ENDPOINT_URL_SQS" {
  type = string
}

provider "aws" {
  region     = var.AWS_REGION
  access_key = var.AWS_ACCESS_KEY_ID
  secret_key = var.AWS_SECRET_ACCESS_KEY

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sns = var.AWS_ENDPOINT_URL_SNS
    sqs = var.AWS_ENDPOINT_URL_SQS
  }
}

locals {
  topology = jsondecode(file("topology.json"))
  
  all_names = distinct(concat(
    [for pub in local.topology.publishers : pub.name],
    flatten([for pub in local.topology.publishers : pub.subscribers])
  ))
  
  subscriptions = flatten([
    for pub in local.topology.publishers : [
      for sub in pub.subscribers : {
        publisher  = pub.name
        subscriber = sub
        key        = "${pub.name}-to-${sub}"
      }
    ]
  ])
}

resource "aws_sns_topic" "topics" {
  for_each = { for pub in local.topology.publishers : pub.name => pub }
  name     = "${each.value.name}-topic"
}

resource "aws_sqs_queue" "queues" {
  for_each = toset(local.all_names)
  name     = "${each.value}-queue"
}

resource "aws_sqs_queue_policy" "queue_policies" {
  for_each = aws_sqs_queue.queues

  queue_url = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      for sub in local.subscriptions : {
        Effect    = "Allow"
        Principal = "*"
        Action    = "SQS:SendMessage"
        Resource  = each.value.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.topics[sub.publisher].arn
          }
        }
      } if sub.subscriber == each.key
    ]
  })
}

resource "aws_sns_topic_subscription" "subscriptions" {
  for_each = { for sub in local.subscriptions : sub.key => sub }

  topic_arn = aws_sns_topic.topics[each.value.publisher].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.queues[each.value.subscriber].arn
}

output "provisioning_summary" {
  value = {
    topics = { for k, v in aws_sns_topic.topics : k => v.arn }
    queues = { for k, v in aws_sqs_queue.queues : k => v.arn }
    subscriptions = {
      for k, v in aws_sns_topic_subscription.subscriptions : k => v.arn
    }
  }
}