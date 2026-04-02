# Amazon Managed Streaming for Apache Kafka (MSK)
resource "aws_msk_cluster" "kafka" {
  cluster_name           = "origin-${var.environment}-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = var.environment == "prod" ? 3 : 2

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = module.vpc.private_subnets
    security_groups = [aws_security_group.kafka_sg.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      scram = true
    }
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "kafka_sg" {
  name        = "origin-${var.environment}-kafka-sg"
  description = "Security group for MSK Kafka"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 9096
    to_port     = 9096
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
