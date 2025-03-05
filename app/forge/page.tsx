"use client"

import { useState, useEffect } from "react"
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
import { 
  Montserrat, 
  Oswald, 
  Lora, 
  Playfair_Display as PlayfairDisplay, 
  Roboto_Mono as RobotoMono, 
  Special_Elite as SpecialElite, 
  Dancing_Script as DancingScript, 
  Bebas_Neue as BebasNeue,
  Tangerine,
  Petit_Formal_Script as PetitFormalScript,
  Satisfy, 
  Pacifico
} from 'next/font/google';
import { useRouter } from "next/navigation";

// Font definitions
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400'] });
const oswald = Oswald({ subsets: ['latin'], weight: ['400'] });
const lora = Lora({ subsets: ['latin'], weight: ['400'] });
const playfair = PlayfairDisplay({ subsets: ['latin'], weight: ['400'] });
const robotoMono = RobotoMono({ subsets: ['latin'], weight: ['400'] });
const specialElite = SpecialElite({ weight: ['400'], subsets: ['latin'] });
const dancingScript = DancingScript({ weight: ['400'], subsets: ['latin'] });
const bebasNeue = BebasNeue({ weight: ['400'], subsets: ['latin'] });
const tangerine = Tangerine({ weight: ['400'], subsets: ['latin'] });
const petitFormalScript = PetitFormalScript({ weight: ['400'], subsets: ['latin'] });
const satisfy = Satisfy({ weight: ['400'], subsets: ['latin'] });
const pacifico = Pacifico({ weight: ['400'], subsets: ['latin'] });

export default function ProductOrder() {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1)
  const [variant, setVariant] = useState("standard")
  const [selectedImage, setSelectedImage] = useState(0)
  const [engravingText, setEngravingText] = useState("")
  const [textAlignment, setTextAlignment] = useState("center")
  const [fontSizePercent, setFontSizePercent] = useState(100)
  const [selectedFont, setSelectedFont] = useState("montserrat")
  
  const productImages = [
    "/retail/forgeVid.gif",
    "/retail/forge2.webp",
    "retail/forge1.webp",
  ]
  
  const variants = [
    { id: "standard", name: "Lighter Engraving", price: 15 },
    { id: "premium", name: "Lighter Engraving + Case engraving", price: 20 },
  ]
  
  const selectedVariant = variants.find(v => v.id === variant) || variants[0]
  const totalPrice = selectedVariant.price * quantity
  
  const fonts = [
    { id: "montserrat", name: "Montserrat", font: montserrat },
    { id: "oswald", name: "Oswald", font: oswald },
    { id: "lora", name: "Lora", font: lora },
    { id: "playfair", name: "Playfair", font: playfair },
    { id: "robotoMono", name: "Roboto Mono", font: robotoMono },
    { id: "specialElite", name: "Special Elite", font: specialElite },
    { id: "dancingScript", name: "Dancing Script", font: dancingScript },
    { id: "bebasNeue", name: "Bebas Neue", font: bebasNeue },
    { id: "tangerine", name: "Tangerine", font: tangerine },
    { id: "petitFormalScript", name: "Petit Formal", font: petitFormalScript },
    { id: "satisfy", name: "Satisfy", font: satisfy },
    { id: "pacifico", name: "Pacifico", font: pacifico },
  ];
  
  const currentFont = fonts.find(f => f.id === selectedFont)?.font || montserrat;
  
  const handleOrderNow = () => {
    const queryParams = new URLSearchParams({
      product: "forge-lighter",
      variant: variant,
      quantity: quantity.toString(),
      engravingText: engravingText,
      fontStyle: selectedFont,
      alignment: textAlignment,
      fontSize: fontSizePercent.toString(),
    }).toString();
    
    router.push(`/checkout?${queryParams}`);
  };
  
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
            FORGE
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
                <h2 className="text-3xl font-bold mb-4 text-foreground">Forge Metal Lighter</h2>
                <p className="text-2xl font-medium text-primary mb-4">${selectedVariant.price}</p>
                <p className="text-muted-foreground mb-6">
                Make it yours. Customize your premium metal lighter with engraved text — names, dates, or a personal message. Built to last, designed to stand out. The perfect gift or everyday companion.
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">In Stock</span>
                </div>
              </div>
              
              <div className="space-y-6 pt-4 border-t border-border">
                {/* Custom Engraving Text Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Custom Engraving Text</label>
                  <div className="relative">
                    <textarea 
                      value={engravingText}
                      onChange={(e) => setEngravingText(e.target.value)}
                      placeholder="Enter your custom text to be engraved (multi-line supported)"
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {engravingText.length} / 200
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your text will be engraved exactly as entered. Line breaks will be preserved.
                  </p>
                  
                  {/* Text Formatting Controls */}
                  <div className="flex flex-wrap gap-4 items-start mt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Alignment</label>
                      <div className="flex border rounded-md overflow-hidden">
                        <button 
                          onClick={() => setTextAlignment("left")}
                          className={`p-2 ${textAlignment === "left" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                          aria-label="Align left"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" x2="20" y1="6" y2="6" />
                            <line x1="4" x2="14" y1="12" y2="12" />
                            <line x1="4" x2="18" y1="18" y2="18" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => setTextAlignment("center")}
                          className={`p-2 ${textAlignment === "center" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                          aria-label="Align center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" x2="20" y1="6" y2="6" />
                            <line x1="8" x2="16" y1="12" y2="12" />
                            <line x1="6" x2="18" y1="18" y2="18" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => setTextAlignment("right")}
                          className={`p-2 ${textAlignment === "right" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                          aria-label="Align right"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" x2="20" y1="6" y2="6" />
                            <line x1="10" x2="20" y1="12" y2="12" />
                            <line x1="6" x2="20" y1="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 w-full max-w-[250px]">
                      <div className="flex justify-between">
                        <label className="text-xs font-medium text-foreground">Font Size</label>
                        <span className="text-xs text-muted-foreground">{fontSizePercent}%</span>
                      </div>
                      <Slider 
                        defaultValue={[100]} 
                        max={200}
                        min={100} 
                        step={1} 
                        value={[fontSizePercent]}
                        onValueChange={(vals) => setFontSizePercent(vals[0])}
                      />
                    </div>
                    
                    {/* Font Selector */}
                    <div className="w-full space-y-1">
                      <label className="text-xs font-medium text-foreground">Font Style</label>
                      <div className="border rounded-md overflow-x-auto p-2" style={{ maxHeight: "80px" }}>
                        <div className="flex flex-wrap gap-2">
                          {fonts.map((font) => (
                            <label 
                              key={font.id}
                              className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                                selectedFont === font.id 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted hover:bg-muted/80"
                              }`}
                              onClick={() => setSelectedFont(font.id)}
                            >
                              <input 
                                type="radio" 
                                name="font" 
                                value={font.id} 
                                checked={selectedFont === font.id}
                                onChange={() => {}}
                                className="sr-only"
                              />
                              <span className={font.font.className}>{font.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Engraving Preview */}
                <div className="mt-4 mb-6">
                  <p className="text-sm font-medium text-foreground mb-2">Engraving Preview</p>
                  <div className="relative w-full aspect-square max-w-md mx-auto rounded-md overflow-hidden border border-input bg-muted/20">
                    {/* Mockup image */}
                    <Image 
                      src="/retail/forge-template.webp" 
                      alt="Engraving mockup" 
                      layout="fill" 
                      objectFit="contain"
                      className="opacity-80"
                    />
                    
                    {/* Text overlay */}
                    <div className="absolute inset-0 flex flex-col justify-center items-center">
                      <div className="w-full max-w-[200px] relative" style={{ top: "15%" }}>
                        <pre 
                          className={`whitespace-pre-wrap text-gray-300 break-words ${
                            textAlignment === 'left' ? 'text-left' : 
                            textAlignment === 'right' ? 'text-right' : 
                            'text-center'
                          }`}
                          style={{ 
                            fontSize: `${fontSizePercent}%`,
                            fontFamily: 'inherit'
                          }}
                        >
                          <span className={currentFont.className}>
                            {engravingText || "Your engraving will appear here"}
                          </span>
                        </pre>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a simulation of how your text might appear. Actual results may vary slightly.
                  </p>
                </div>
                
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
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-10 w-10 flex items-center justify-center rounded-l-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <div className="h-10 px-4 flex items-center justify-center border-t border-b border-input bg-background min-w-[60px]">
                      {quantity}
                    </div>
                    <button
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="h-10 w-10 flex items-center justify-center rounded-r-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-border">
                  <div className="flex justify-between mb-4">
                    <span className="text-foreground font-medium">Total Price</span>
                    <span className="text-foreground font-bold">${totalPrice}</span>
                  </div>
                  
                  <Button 
                    className="w-full py-6 text-lg hover:scale-105 transition-all duration-300"
                    onClick={handleOrderNow}
                    disabled={!engravingText.trim()}
                  >
                    {engravingText.trim() ? 'Order Now' : 'Enter Custom Text'}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {engravingText.trim() 
                      ? "No returns on custom orders. Read more" 
                      : "Custom text is required to place an order"}
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