"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"

export default function Checkout() {
  const searchParams = useSearchParams();
  
  // States for order details
  const [orderDetails, setOrderDetails] = useState({
    product: "",
    variant: "",
    quantity: 1,
    engravingText: "",
    fontStyle: "",
    alignment: "",
    fontSize: 100,
    loaded: false
  });
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    shippingMethod: "standard",
    paymentMethod: "creditCard",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: ""
  })
  
  // Parse URL parameters on page load
  useEffect(() => {
    if (searchParams) {
      const product = searchParams.get("product") || "";
      const variant = searchParams.get("variant") || "";
      const quantity = parseInt(searchParams.get("quantity") || "1", 10);
      const engravingText = searchParams.get("engravingText") || "";
      const fontStyle = searchParams.get("fontStyle") || "";
      const alignment = searchParams.get("alignment") || "";
      const fontSize = parseInt(searchParams.get("fontSize") || "100", 10);
      
      setOrderDetails({
        product,
        variant,
        quantity,
        engravingText,
        fontStyle,
        alignment,
        fontSize,
        loaded: true
      });
    }
  }, [searchParams]);
  
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }
  
  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }
  
  const shippingMethods = [
    { id: "standard", name: "Standard Shipping", price: 4.99, time: "3-5 business days" },
    { id: "express", name: "Express Shipping", price: 9.99, time: "1-2 business days" },
  ]
  
  // Get product details based on the product identifier
  const getProductDetails = () => {
    // This function would likely call an API or use a product database
    // For now, we'll hardcode the Forge lighter details
    if (orderDetails.product === "forge-lighter") {
      const variants = {
        "standard": { name: "Lighter Engraving", price: 15 },
        "premium": { name: "Lighter Engraving + Case engraving", price: 20 }
      };
      
      const selectedVariant = variants[orderDetails.variant] || variants.standard;
      
      return {
        name: "Forge Metal Lighter",
        variantName: selectedVariant.name,
        price: selectedVariant.price,
        image: "/retail/forge1.webp"  // Use your actual image path
      };
    }
    
    // Default fallback
    return {
      name: "Product",
      variantName: "Standard",
      price: 15.00,
      image: "/placeholder.svg"
    };
  };
  
  const productDetails = getProductDetails();
  
  // Calculate order summary based on dynamic product details
  const orderSummary = {
    items: [
      { 
        name: productDetails.name, 
        variant: productDetails.variantName, 
        price: productDetails.price, 
        quantity: orderDetails.quantity,
        image: productDetails.image,
        customization: orderDetails.engravingText ? {
          text: orderDetails.engravingText,
          font: orderDetails.fontStyle,
          alignment: orderDetails.alignment,
          fontSize: orderDetails.fontSize
        } : null
      }
    ],
    subtotal: productDetails.price * orderDetails.quantity,
    shipping: shippingMethods.find(m => m.id === formData.shippingMethod)?.price || 4.99,
    tax: (productDetails.price * orderDetails.quantity) * 0.08 // Assuming 8% tax
  };
  
  const total = orderSummary.subtotal + orderSummary.shipping + orderSummary.tax;
  
  return (
    <>
      <main className="min-h-screen px-4 py-12 md:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            className="text-3xl md:text-4xl font-bold mb-8 text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Checkout
          </motion.h1>
          
          {/* Steps Indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium text-sm
                        ${step === stepNumber 
                          ? "border-primary bg-primary text-primary-foreground" 
                          : step > stepNumber 
                            ? "border-primary bg-primary/20 text-primary" 
                            : "border-muted-foreground/30 text-muted-foreground"
                        }`}
                    >
                      {stepNumber}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${step >= stepNumber ? "text-foreground" : "text-muted-foreground"}`}>
                      {stepNumber === 1 ? "Shipping" : stepNumber === 2 ? "Payment" : "Review"}
                    </div>
                  </div>
                  
                  {stepNumber < 3 && (
                    <div className={`absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px] ${step > stepNumber ? "bg-primary" : "bg-muted-foreground/30"}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Main Form Area */}
            <div className="md:col-span-3 space-y-8">
              {/* Step 1: Shipping Details */}
              {step === 1 && (
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-xl font-semibold border-b border-border pb-4">Shipping Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={formData.firstName} 
                        onChange={(e) => updateFormData("firstName", e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={formData.lastName} 
                        onChange={(e) => updateFormData("lastName", e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={formData.email} 
                        onChange={(e) => updateFormData("email", e.target.value)}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={(e) => updateFormData("phone", e.target.value)}
                        placeholder="(123) 456-7890"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea 
                      id="address" 
                      value={formData.address} 
                      onChange={(e) => updateFormData("address", e.target.value)}
                      placeholder="123 Main St, Apt 4B"
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        value={formData.city} 
                        onChange={(e) => updateFormData("city", e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select 
                        value={formData.state}
                        onValueChange={(value) => updateFormData("state", value)}
                      >
                        <SelectTrigger id="state">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AL">Alabama</SelectItem>
                          <SelectItem value="AK">Alaska</SelectItem>
                          <SelectItem value="AZ">Arizona</SelectItem>
                          {/* Add more states */}
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="CA">California</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input 
                        id="zipCode" 
                        value={formData.zipCode} 
                        onChange={(e) => updateFormData("zipCode", e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select 
                      value={formData.country}
                      onValueChange={(value) => updateFormData("country", value)}
                    >
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <Label>Shipping Method</Label>
                    <RadioGroup 
                      value={formData.shippingMethod} 
                      onValueChange={(value) => updateFormData("shippingMethod", value)}
                      className="space-y-3"
                    >
                      {shippingMethods.map((method) => (
                        <div 
                          key={method.id}
                          className="flex items-start space-x-3 rounded-lg border border-input p-4 hover:bg-accent/50 transition-colors"
                        >
                          <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={method.id} className="text-base font-medium cursor-pointer">
                              {method.name}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">{method.time}</p>
                          </div>
                          <div className="font-medium text-right">${method.price.toFixed(2)}</div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </motion.div>
              )}
              
              {/* Step 2: Payment Method */}
              {step === 2 && (
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-xl font-semibold border-b border-border pb-4">Payment Method</h2>
                  
                  <RadioGroup 
                    value={formData.paymentMethod} 
                    onValueChange={(value) => updateFormData("paymentMethod", value)}
                    className="space-y-3"
                  >
                    <div 
                      className="flex items-center space-x-3 rounded-lg border border-input p-4 hover:bg-accent/50 transition-colors"
                    >
                      <RadioGroupItem value="creditCard" id="creditCard" />
                      <Label htmlFor="creditCard" className="flex-1 cursor-pointer">Credit Card</Label>
                      <div className="flex space-x-1">
                        <div className="w-10 h-6 bg-muted rounded-md"></div>
                        <div className="w-10 h-6 bg-muted rounded-md"></div>
                        <div className="w-10 h-6 bg-muted rounded-md"></div>
                      </div>
                    </div>
                    
                    <div 
                      className="flex items-center space-x-3 rounded-lg border border-input p-4 hover:bg-accent/50 transition-colors"
                    >
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex-1 cursor-pointer">PayPal</Label>
                      <div className="w-16 h-6 bg-muted rounded-md"></div>
                    </div>
                  </RadioGroup>
                  
                  {formData.paymentMethod === "creditCard" && (
                    <div className="space-y-4 mt-6 p-4 border border-input rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input 
                          id="cardNumber" 
                          value={formData.cardNumber} 
                          onChange={(e) => updateFormData("cardNumber", e.target.value)}
                          placeholder="4242 4242 4242 4242"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Name on Card</Label>
                        <Input 
                          id="cardName" 
                          value={formData.cardName} 
                          onChange={(e) => updateFormData("cardName", e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardExpiry">Expiration Date</Label>
                          <Input 
                            id="cardExpiry" 
                            value={formData.cardExpiry} 
                            onChange={(e) => updateFormData("cardExpiry", e.target.value)}
                            placeholder="MM/YY"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="cardCvv">Security Code</Label>
                          <Input 
                            id="cardCvv" 
                            value={formData.cardCvv} 
                            onChange={(e) => updateFormData("cardCvv", e.target.value)}
                            placeholder="123"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {formData.paymentMethod === "paypal" && (
                    <div className="mt-6 p-8 border border-input rounded-lg text-center bg-accent/10">
                      <p className="text-muted-foreground">
                        You'll be redirected to PayPal to complete your purchase securely.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Step 3: Review Order */}
              {step === 3 && (
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-xl font-semibold border-b border-border pb-4">Review Order</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="font-medium">Shipping Information</h3>
                      <div className="bg-accent/10 p-4 rounded-md">
                        <p>{formData.firstName} {formData.lastName}</p>
                        <p>{formData.address}</p>
                        <p>{formData.city}, {formData.state} {formData.zipCode}</p>
                        <p>{formData.email}</p>
                        <p>{formData.phone}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Payment Method</h3>
                      <div className="bg-accent/10 p-4 rounded-md">
                        {formData.paymentMethod === "creditCard" ? (
                          <p>Credit Card ending in {formData.cardNumber.slice(-4)}</p>
                        ) : (
                          <p>PayPal</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Shipping Method</h3>
                      <div className="bg-accent/10 p-4 rounded-md">
                        <p>
                          {shippingMethods.find(m => m.id === formData.shippingMethod)?.name} - 
                          ${shippingMethods.find(m => m.id === formData.shippingMethod)?.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Navigation Buttons */}
              <div className="pt-6 flex justify-between">
                {step > 1 ? (
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className="min-w-[100px]"
                  >
                    Back
                  </Button>
                ) : (
                  <div></div>
                )}
                
                {step < 3 ? (
                  <Button 
                    onClick={nextStep}
                    className="min-w-[100px]"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button 
                    className="min-w-[180px] bg-green-600 hover:bg-green-700"
                    onClick={() => alert("Order placed successfully!")}
                  >
                    Place Order
                  </Button>
                )}
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="md:col-span-2">
              <motion.div 
                className="border border-border rounded-lg p-6 bg-background sticky top-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-4 mb-4">
                  {orderSummary.items.map((item, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-md overflow-hidden relative flex-shrink-0 border border-input">
                          <Image 
                            src={item.image} 
                            alt={item.name} 
                            layout="fill" 
                            objectFit="cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.variant}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      
                      {/* Custom Engraving Details */}
                      {item.customization && (
                        <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1">
                          <p className="font-medium text-xs uppercase text-muted-foreground">Custom Engraving</p>
                          <p className="break-words border-l-2 border-primary/30 pl-2">"{item.customization.text}"</p>
                          <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground pt-1">
                            <span>Font: {item.customization.font}</span>
                            <span>Align: {item.customization.alignment}</span>
                            <span>Size: {item.customization.fontSize}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${orderSummary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>${orderSummary.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${orderSummary.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-base pt-2 border-t border-border mt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
                  <p className="mb-2">We accept:</p>
                  <div className="flex gap-1">
                    <div className="w-8 h-5 bg-muted rounded-md"></div>
                    <div className="w-8 h-5 bg-muted rounded-md"></div>
                    <div className="w-8 h-5 bg-muted rounded-md"></div>
                    <div className="w-8 h-5 bg-muted rounded-md"></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
} 