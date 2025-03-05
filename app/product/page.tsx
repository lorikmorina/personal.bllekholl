"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"

export default function ProductOrder() {
  const [quantity, setQuantity] = useState(1)
  const [variant, setVariant] = useState("standard")
  const [selectedImage, setSelectedImage] = useState(0)
  
  const productImages = [
    "/placeholder.svg?height=600&width=500",
    "/placeholder.svg?height=600&width=500",
    "/placeholder.svg?height=600&width=500",
  ]
  
  const variants = [
    { id: "standard", name: "Standard", price: 199 },
    { id: "premium", name: "Premium", price: 299 },
    { id: "deluxe", name: "Deluxe", price: 399 },
  ]
  
  const selectedVariant = variants.find(v => v.id === variant) || variants[0]
  const totalPrice = selectedVariant.price * quantity
  
  return (
    <>
      <main className="min-h-screen px-4 py-12 md:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-8 text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Product Order
          </motion.h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Product Images */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative w-full aspect-square rounded-3xl overflow-hidden border-2 border-primary/10">
                <Image 
                  src={productImages[selectedImage]} 
                  alt="Product" 
                  layout="fill" 
                  objectFit="cover"
                  className="transition-all duration-500 ease-in-out hover:scale-105"
                />
              </div>
              
              <div className="flex gap-4 justify-center">
                {productImages.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      selectedImage === idx ? "border-primary ring-2 ring-primary/20" : "border-primary/10 hover:border-primary/30"
                    }`}
                  >
                    <Image src={img} alt={`Product view ${idx + 1}`} layout="fill" objectFit="cover" />
                  </button>
                ))}
              </div>
            </motion.div>
            
            {/* Product Details and Order Form */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div>
                <h2 className="text-3xl font-bold mb-4 text-foreground">Minimalist Vase</h2>
                <p className="text-2xl font-medium text-primary mb-4">${selectedVariant.price}</p>
                <p className="text-muted-foreground mb-6">
                  Handcrafted ceramic vase with a sleek, minimalist design. Perfect for modern interior spaces that need a touch of elegance. Each piece is unique, with subtle variations in texture and glaze.
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">In Stock</span>
                </div>
              </div>
              
              <div className="space-y-6 pt-4 border-t border-border">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Variant</label>
                  <Select value={variant} onValueChange={setVariant}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} - ${v.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-foreground">Quantity</label>
                    <span className="text-sm text-muted-foreground">{quantity}</span>
                  </div>
                  <div className="py-4">
                    <Slider 
                      defaultValue={[1]} 
                      max={10} 
                      step={1} 
                      value={[quantity]}
                      onValueChange={(vals) => setQuantity(vals[0])}
                    />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-border">
                  <div className="flex justify-between mb-4">
                    <span className="text-foreground font-medium">Total Price</span>
                    <span className="text-foreground font-bold">${totalPrice}</span>
                  </div>
                  
                  <Button 
                    className="w-full py-6 text-lg hover:scale-105 transition-all duration-300"
                    onClick={() => alert(`Added to cart: ${quantity} ${selectedVariant.name} vase(s)`)}
                  >
                    Add to Cart
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Free shipping on orders over $50. 30-day return policy.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Product Details Section */}
          <motion.div 
            className="mt-24 space-y-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-foreground">Product Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Materials</h3>
                <p className="text-muted-foreground">
                  High-quality ceramic with a semi-matte finish. Each vase is fired at 1200°C for exceptional durability.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Dimensions</h3>
                <p className="text-muted-foreground">
                  Height: 25cm<br />
                  Diameter: 12cm<br />
                  Weight: 0.8kg
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Care</h3>
                <p className="text-muted-foreground">
                  Hand wash only. Avoid abrasive cleaners. Not recommended for outdoor use.
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Related Products */}
          <motion.div 
            className="mt-24"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-8 text-foreground">You May Also Like</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div 
                  key={item} 
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover-lift"
                >
                  <div className="relative h-60 overflow-hidden">
                    <Image
                      src="/placeholder.svg?height=240&width=180"
                      alt={`Related product ${item}`}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-foreground">Related Product {item}</h3>
                    <p className="text-sm text-muted-foreground">$149</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </>
  )
} 