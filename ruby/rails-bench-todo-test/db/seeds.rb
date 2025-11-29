# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Clean up existing data
if Rails.env.development?
  ActivityLog.delete_all
  TimeEntry.delete_all
  Comment.delete_all
  Tagging.delete_all
  Assignment.delete_all
  Todo.delete_all
  Tag.delete_all
  Category.delete_all
  Project.delete_all
  OrganizationMembership.delete_all
  Organization.delete_all
  User.delete_all
end

puts "Creating Users (100)..."
users = []
100.times do |i|
  users << User.create!(
    email: "user#{i+1}@example.com",
    name: "User #{i+1}"
  )
end

puts "Creating Organizations (10)..."
organizations = []
10.times do |i|
  organizations << Organization.create!(name: "Org #{i+1}")
end

puts "Creating Memberships..."
users.each do |user|
  OrganizationMembership.create!(user: user, organization: organizations.sample, role: [:admin, :member].sample)
end

puts "Creating Projects (50)..."
projects = []
50.times do |i|
  projects << Project.create!(name: "Project #{i+1}", description: "Desc #{i+1}", organization: organizations.sample)
end

puts "Creating Categories..."
categories = []
projects.each do |proj|
  3.times { |i| categories << Category.create!(name: "Cat #{i+1}", project: proj) }
end

puts "Creating Tags (20)..."
tags = []
20.times do |i|
  tags << Tag.create!(name: "Tag #{i+1}", color: "#%06x" % (rand * 0xffffff))
end

puts "Creating Todos (2000)..."
todos_data = []
2000.times do |i|
  project = projects.sample
  # 80% chance to have a category from the project
  category = (rand < 0.8) ? Category.where(project: project).sample : nil
  
  todo = Todo.new(
    title: "Todo #{i+1} - #{SecureRandom.hex(4)}",
    project: project,
    category: category,
    completed: [true, false].sample
  )
  todo.save!
  
  # Assign random tags (0 to 3 tags)
  todo.tags << tags.sample(rand(0..3))
  
  # Assign random user
  Assignment.create!(todo: todo, user: users.sample)
end

puts "Seeding finished!"