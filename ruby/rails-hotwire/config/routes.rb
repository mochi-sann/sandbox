Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  resources :tasks, only: %i[index create edit update destroy] do
    patch :toggle, on: :member
  end

  root "tasks#index"
end
