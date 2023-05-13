"use client"
import React from "react"
import { useForm } from "react-hook-form";

export type newClothFormProps = {}
type newClothFormData = {
  name: String
  price: Number
}

export const NewClothForm: React.FC<newClothFormProps> = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<newClothFormData>();
  const onSubmit = handleSubmit(data => console.log(data));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* register your input into the hook by invoking the "register" function */}
      <input type="text" className="input w-full input-bordered" defaultValue="test" {...register("name")} />
      <input type="number" className="input w-full input-bordered" defaultValue="1000" {...register("price")} />


      {/* include validation with required or other standard HTML validation rules */}
      {/* errors will return when field validation fails  */}

      <input type="submit" className="btn  w-full" />
    </form>
  )
}

