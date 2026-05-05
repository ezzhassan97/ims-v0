"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateLaunchWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const steps = [
  { id: 1, name: "Base Info", description: "Launch type and source" },
  { id: 2, name: "Developer & Project", description: "Select developer and project" },
  { id: 3, name: "Offerings", description: "Property offerings" },
  { id: 4, name: "Payment Plans", description: "Configure payment options" },
  { id: 5, name: "Launch Info", description: "Additional details" },
  { id: 6, name: "Review", description: "Review and submit" },
]

export function CreateLaunchWizard({ open, onOpenChange }: CreateLaunchWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Launch</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2",
                      currentStep > step.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : currentStep === step.id
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <p className={cn(
                    "text-xs mt-2 text-center max-w-20",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.name}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-2 mt-[-20px]",
                      currentStep > step.id ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] py-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">Base Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Launch Type</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="launch">Launch</SelectItem>
                      <SelectItem value="release">Release</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium">Developer & Project</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Developer</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select developer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="palm-hills">Palm Hills Development</SelectItem>
                      <SelectItem value="emaar">Emaar Misr</SelectItem>
                      <SelectItem value="sodic">Sodic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project1">Palm Hills October</SelectItem>
                      <SelectItem value="project2">Palm Hills Katameya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project Name (EN)</Label>
                  <Input className="mt-1" placeholder="Enter project name in English" />
                </div>
                <div>
                  <Label>Area</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="october">6th of October</SelectItem>
                      <SelectItem value="cairo">New Cairo</SelectItem>
                      <SelectItem value="coast">North Coast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium">Property Offerings</h3>
              <p className="text-sm text-muted-foreground">Add property offerings for this launch.</p>
              <div className="border border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No offerings added yet</p>
                <Button variant="outline" size="sm" className="mt-2 bg-transparent">Add Offering</Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium">Payment Plans</h3>
              <p className="text-sm text-muted-foreground">Configure payment plans for this launch.</p>
              <div className="border border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No payment plans added yet</p>
                <Button variant="outline" size="sm" className="mt-2 bg-transparent">Add Payment Plan</Button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium">Launch Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>EOI Amount</Label>
                  <Input className="mt-1" placeholder="e.g., 50,000 EGP" />
                </div>
                <div>
                  <Label>Launch Date</Label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <Label>Nawy Quota</Label>
                  <Input className="mt-1" placeholder="e.g., 50 units" />
                </div>
                <div>
                  <Label>Commission</Label>
                  <Input className="mt-1" placeholder="e.g., 3%" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="font-medium">Review & Submit</h3>
              <p className="text-sm text-muted-foreground">Review your launch details before submitting.</p>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>Launch</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>Manual</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Developer</span>
                  <span>Palm Hills Development</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span>Palm Hills October</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area</span>
                  <span>6th of October</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {currentStep === steps.length ? (
              <Button disabled>Submit</Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
