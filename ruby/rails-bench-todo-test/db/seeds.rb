# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Clean up existing data (optional, be careful in production)
if Rails.env.development?
  ActivityLog.destroy_all
  TimeEntry.destroy_all
  Comment.destroy_all
  Tagging.destroy_all
  Assignment.destroy_all
  Todo.destroy_all
  Tag.destroy_all
  Category.destroy_all
  Project.destroy_all
  OrganizationMembership.destroy_all
  Organization.destroy_all
  User.destroy_all
end

puts "Creating Users..."
users = []
5.times do |i|
  users << User.create!(
    email: "user#{i+1}@example.com",
    name: "User #{i+1}"
  )
end

puts "Creating Organizations..."
org1 = Organization.create!(name: "Acme Corp")
org2 = Organization.create!(name: "Beta Inc")

puts "Creating Memberships..."
OrganizationMembership.create!(user: users[0], organization: org1, role: :admin)
OrganizationMembership.create!(user: users[1], organization: org1, role: :member)
OrganizationMembership.create!(user: users[2], organization: org1, role: :member)
OrganizationMembership.create!(user: users[3], organization: org2, role: :admin)
OrganizationMembership.create!(user: users[4], organization: org2, role: :member)

puts "Creating Projects..."
proj1 = Project.create!(name: "Website Redesign", description: "Overhaul the main company website", organization: org1)
proj2 = Project.create!(name: "Q4 Marketing", description: "Marketing campaign for Q4", organization: org1)
proj3 = Project.create!(name: "Internal Tooling", description: "Fix internal scripts", organization: org2)

puts "Creating Categories..."
cat_frontend = Category.create!(name: "Frontend", project: proj1)
cat_backend = Category.create!(name: "Backend", project: proj1)
cat_design = Category.create!(name: "Design", project: proj1)
cat_marketing = Category.create!(name: "Ads", project: proj2)

puts "Creating Tags..."
tags = ["High Priority", "Bug", "Feature", "Review Needed"].map do |name|
  Tag.create!(name: name, color: ["#ff0000", "#00ff00", "#0000ff", "#ffa500"].sample)
end

puts "Creating Todos..."
todos = [
  { title: "Design Home Page", project: proj1, category: cat_design, completed: true },
  { title: "Implement Navbar", project: proj1, category: cat_frontend, completed: false },
  { title: "Setup Database", project: proj1, category: cat_backend, completed: true },
  { title: "Create Ad Banners", project: proj2, category: cat_marketing, completed: false },
  { title: "Fix Login Bug", project: proj3, category: nil, completed: false }
]

todos.each do |t|
  todo = Todo.create!(
    title: t[:title],
    project: t[:project],
    category: t[:category],
    completed: t[:completed]
  )
  
  # Assign random tags
  todo.tags << tags.sample(rand(1..2))
  
  # Assign random user
  Assignment.create!(todo: todo, user: users.sample)
  
  # Create random comments
  rand(0..3).times do
    Comment.create!(
      todo: todo, 
      user: users.sample, 
      content: ["Great job!", "Needs revision.", "Looking into it.", "Done."].sample
    )
  end
  
  # Create Activity Log
  ActivityLog.create!(
    user: users.sample,
    entity_type: "Todo",
    entity_id: todo.id,
    action: "created",
    details: { title: todo.title }
  )
end

puts "Seeding finished!"