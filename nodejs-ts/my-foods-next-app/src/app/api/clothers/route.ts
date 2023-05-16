

import { newClothFormData } from "@/components/form/newClothForm";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
type ClothesPostBody = {
  name: string;
  price: number;
}

export async function POST(request: Request) {
  const body = await request.json() as newClothFormData
  console.log(await request.json())
  console.log(request.body)
  const clothes = await prisma.clothers.create({
    data: {
      price: body.price, name: body.name
    }
  })

  return NextResponse.json(clothes);

}

