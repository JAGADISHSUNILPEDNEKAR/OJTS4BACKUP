# Managed Databases
# PostgreSQL RDS (Primary Application DB)
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "origin-${var.environment}-db"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = "db.t4g.large"

  allocated_storage     = 50
  max_allocated_storage = 1000

  db_name  = "origin"
  username = "origin_admin"
  port     = 5432

  # Wait to create DB password via secrets manager/vault
  manage_master_user_password = true

  multi_az               = var.environment == "prod" ? true : false
  create_db_subnet_group = true
  subnet_ids             = module.vpc.database_subnets
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"
  
  skip_final_snapshot = var.environment == "prod" ? false : true
}

# Subnet Group for Cache
resource "aws_elasticache_subnet_group" "redis" {
  name       = "origin-${var.environment}-redis-subnet"
  subnet_ids = module.vpc.private_subnets
}

# Redis Cluster (ElastiCache)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "origin-${var.environment}-redis"
  description                = "Redis cluster for Origin Auth and Locks"
  node_type                  = "cache.t4g.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  automatic_failover_enabled = var.environment == "prod" ? true : false
  
  num_cache_clusters         = var.environment == "prod" ? 2 : 1
  
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis_sg.id]
}

# TimescaleDB M5 representation (could also be provisioned on self-hosted EC2/EKS if Timescale Cloud isn't used)
# A TimescaleDB instance is defined here as an RDS postgres instance as a placeholder. In a production scenario
# you may use timescaledb provider or similar.
# AWS Secrets Manager Secret for TimescaleDB
resource "aws_secretsmanager_secret" "timescaledb_password" {
  name        = "origin-${var.environment}-timescaledb-password"
  description = "TimescaleDB Master Password"
}

resource "aws_secretsmanager_secret_version" "timescaledb_password" {
  secret_id     = aws_secretsmanager_secret.timescaledb_password.id
  secret_string = "REPLACE_WITH_SECURE_PASSWORD" # In production, set via CLI or Console
}

resource "aws_db_instance" "timescaledb" {
  identifier          = "origin-${var.environment}-timescaledb"
  engine              = "postgres"
  instance_class      = "db.m5.large"
  allocated_storage   = 100
  username            = "tsdb_admin"
  password            = aws_secretsmanager_secret_version.timescaledb_password.secret_string
  skip_final_snapshot = var.environment == "prod" ? false : true
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  db_subnet_group_name   = module.db.db_subnet_group_name
}

# DB Security Group
resource "aws_security_group" "db_sg" {
  name        = "origin-${var.environment}-db-sg"
  description = "Security group for Databases"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}

# Redis SG
resource "aws_security_group" "redis_sg" {
  name        = "origin-${var.environment}-redis-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}
