# Amazon Elastic Kubernetes Service (EKS) Cluster

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "origin-${var.environment}-cluster"
  cluster_version = "1.28"

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  # OIDC identity provider for IRSA (IAM Roles for Service Accounts)
  enable_irsa = true

  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    instance_types = ["m5.large"]
    
    attach_cluster_primary_security_group = true
    vpc_security_group_ids                = [aws_security_group.eks_nodes_sg.id]
  }

  eks_managed_node_groups = {
    # Core system nodes
    core = {
      min_size     = 2
      max_size     = 5
      desired_size = 2

      instance_types = ["t3.xlarge"]
      capacity_type  = "ON_DEMAND"
    }

    # High compute for ML models
    ml_compute = {
      min_size     = 1
      max_size     = 3
      desired_size = 1

      instance_types = ["m5.xlarge", "c5.xlarge"]
      capacity_type  = "SPOT"
      
      labels = {
        workload = "machine-learning"
      }
      
      taints = {
        ml-only = {
          key    = "dedicated"
          value  = "machine-learning"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = "Origin"
  }
}

# Allow EKS nodes to access the databases/redis
resource "aws_security_group" "eks_nodes_sg" {
  name        = "origin-${var.environment}-eks-nodes-sg"
  description = "Security group for EKS nodes"
  vpc_id      = module.vpc.vpc_id

  tags = {
    Name = "origin-${var.environment}-eks-nodes-sg"
  }
}

# Rule allowing nodes to ingress
resource "aws_security_group_rule" "nodes_internal" {
  description              = "Allow nodes to communicate with each other"
  from_port                = 0
  protocol                 = "-1"
  security_group_id        = aws_security_group.eks_nodes_sg.id
  source_security_group_id = aws_security_group.eks_nodes_sg.id
  to_port                  = 65535
  type                     = "ingress"
}

# Allow EKS nodes to connect to PostgreSQL/TimescaleDB
resource "aws_security_group_rule" "eks_to_db" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_nodes_sg.id
  security_group_id        = aws_security_group.db_sg.id
}

# Allow EKS nodes to connect to Redis
resource "aws_security_group_rule" "eks_to_redis" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_nodes_sg.id
  security_group_id        = aws_security_group.redis_sg.id
}
