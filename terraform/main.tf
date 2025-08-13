terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Get latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "smr-io-vpc"
    Type = "networking"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "smr-io-igw"
  })
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "smr-io-public-subnet"
  })
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "smr-io-public-rt"
  })
}

# Route Table Association
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "web" {
  name_prefix = "smr-io-web-"
  vpc_id      = aws_vpc.main.id

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # HTTP access
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "smr-io-web-sg"
  })
}

# SSH Key Pair
resource "aws_key_pair" "main" {
  key_name   = "smr-io-key"
  public_key = file(var.ssh_public_key_path)

  tags = merge(local.common_tags, {
    Name = "smr-io-key"
  })
}

# EC2 Instance
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.main.key_name
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = aws_subnet.public.id

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    domain_name         = var.domain_name
    letsencrypt_email   = var.letsencrypt_email
    openai_api_key      = var.openai_api_key
    aws_access_key_id   = var.aws_access_key_id
    aws_secret_key      = var.aws_secret_access_key
    aws_region          = var.aws_region
    github_repo_url     = var.github_repo_url
  })

  tags = merge(local.common_tags, {
    Name = "smr-io-web"
  })

  depends_on = [aws_internet_gateway.main]
}

# Elastic IP
resource "aws_eip" "main" {
  instance = aws_instance.web.id
  domain   = "vpc"

  tags = merge(local.common_tags, {
    Name = "smr-io-eip"
  })

  depends_on = [aws_internet_gateway.main]
}

# Common tags
locals {
  common_tags = {
    Project     = "smr-io"
    Environment = "production"
    ManagedBy   = "terraform"
    Owner       = var.domain_name
    Application = var.domain_name
    Domain      = var.domain_name
    CostCenter  = var.domain_name
  }
}
