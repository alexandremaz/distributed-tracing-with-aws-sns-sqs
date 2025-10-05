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

resource "aws_sns_topic" "first_topic" {
  name = "first-topic"
}

resource "aws_sns_topic" "second_topic" {
  name = "second-topic"
}

resource "aws_sqs_queue" "first_queue" {
  name = "first-queue"
}

resource "aws_sqs_queue" "second_queue" {
  name = "second-queue"
}

resource "aws_sqs_queue_policy" "first_queue_policy" {
  queue_url = aws_sqs_queue.first_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "SQS:SendMessage"
        Resource  = aws_sqs_queue.first_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.second_topic.arn
          }
        }
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "second_queue_policy" {
  queue_url = aws_sqs_queue.second_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "SQS:SendMessage"
        Resource  = aws_sqs_queue.second_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.first_topic.arn
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "first_to_second" {
  topic_arn = aws_sns_topic.first_topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.second_queue.arn
}

resource "aws_sns_topic_subscription" "second_to_first" {
  topic_arn = aws_sns_topic.second_topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.first_queue.arn
}

output "provisioning_summary" {
  value = {
    first_topic_arn  = aws_sns_topic.first_topic.arn
    second_topic_arn = aws_sns_topic.second_topic.arn
    first_queue_arn  = aws_sqs_queue.first_queue.arn
    second_queue_arn = aws_sqs_queue.second_queue.arn
  }
}