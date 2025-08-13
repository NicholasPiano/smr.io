output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.main.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.web.public_dns
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.web.id
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.web.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/smr-io-key ubuntu@${aws_eip.main.public_ip}"
}

output "dns_instructions" {
  description = "DNS configuration instructions"
  value = <<EOT
Configure your DNS:
1. Create an A record for ${var.domain_name} pointing to: ${aws_eip.main.public_ip}
2. Create an A record for www.${var.domain_name} pointing to: ${aws_eip.main.public_ip}
EOT
}
