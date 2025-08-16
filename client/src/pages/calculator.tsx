import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Scale, Building, Wrench, GraduationCap, User, Calendar, Award, Shield } from "lucide-react";
import type { CalculationRequest, CalculationResult, PricingConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import comsignLogo from "@assets/Comsign-logo_1755345203728.jpg";

export default function Calculator() {
  const [projectType, setProjectType] = useState<string>("");
  const [years, setYears] = useState<string>("");
  const [certificates, setCertificates] = useState<number>(1);
  const [backupCertificates, setBackupCertificates] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);

  const projectTypes = [
    { value: "lawyers", label: "עורכי דין", icon: Scale },
    { value: "architects", label: "אדריכלים", icon: Building },
    { value: "engineers", label: "מהנדסים", icon: Wrench },
    { value: "magna", label: "מגנא", icon: GraduationCap },
    { value: "regular", label: "רגיל", icon: User }
  ];

  // Get available years for selected project type
  const { data: availableYears = [] } = useQuery<number[]>({
    queryKey: ["/api/pricing", projectType, "years"],
    enabled: !!projectType,
  });

  // Calculate price mutation
  const calculateMutation = useMutation({
    mutationFn: async (data: CalculationRequest): Promise<CalculationResult> => {
      const res = await apiRequest("POST", "/api/calculate", data);
      return res.json();
    },
    onSuccess: (result) => {
      setCalculationResult(result);
    },
  });

  // Auto-calculate when inputs change
  useEffect(() => {
    if (projectType && years && certificates > 0) {
      const data: CalculationRequest = {
        projectType,
        years: parseInt(years),
        certificates,
        backupCertificates,
      };
      calculateMutation.mutate(data);
    } else {
      setCalculationResult(null);
    }
  }, [projectType, years, certificates, backupCertificates]);

  // Reset years when project type changes
  useEffect(() => {
    setYears("");
  }, [projectType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" style={{fontFamily: 'system-ui, -apple-system, sans-serif', direction: 'rtl', textAlign: 'right'}}>
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/4 -left-20 w-60 h-60 bg-gradient-to-br from-pink-400/15 to-red-400/15 rounded-full animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/25 to-orange-400/25 rounded-full animate-ping" style={{animationDuration: '4s'}}></div>
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full animate-pulse" style={{animationDuration: '2s'}}></div>
      </div>
      <Card className="w-full max-w-md shadow-2xl relative bg-white/90 backdrop-blur-sm border-2 border-transparent bg-clip-padding" style={{direction: 'rtl', textAlign: 'right', background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6) border-box'}}>
        <CardContent className="p-8">
          {/* Header with Logo and Settings */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {/* Logo on the right */}
              <div className="flex-shrink-0">
                <img 
                  src={comsignLogo} 
                  alt="Comsign Logo" 
                  className="h-24 w-auto object-contain"
                  data-testid="logo-comsign"
                />
              </div>
              
              {/* Settings button on the left */}
              <div>
                <Button variant="outline" size="lg" className="border-2 border-purple-300 text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-400 p-4 transition-all duration-300 shadow-lg hover:shadow-xl animate-pulse" data-testid="button-settings">
                  <Settings className="h-4 w-4 animate-spin" style={{animationDuration: '4s'}} />
                </Button>
              </div>
            </div>
            
            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2" data-testid="title-main">
                מחירון פרויקטים
              </h1>
              <div className="w-20 h-1.5 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 mx-auto rounded-full shadow-lg animate-pulse"></div>
            </div>
          </div>

          {/* Calculator Form */}
          <div className="space-y-6">
            {/* Project Type Selection */}
            <div>
              <Label className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 block text-right flex items-center gap-2 justify-end" data-testid="label-project-type">
                <span>סוג הפרויקט</span>
                <Building className="h-5 w-5 text-blue-500 animate-bounce" style={{animationDuration: '2s'}} />
              </Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger className="w-full p-3 border-2 border-blue-300 text-lg focus:border-blue-500 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-50 to-purple-50" data-testid="select-project-type">
                  <SelectValue placeholder="בחר סוג פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`}>
                        <div className="flex items-center gap-2 justify-end" style={{direction: 'rtl'}}>
                          <span>{type.label}</span>
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Years Selection */}
            <div>
              <Label className="text-lg font-semibold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3 block text-right flex items-center gap-2 justify-end" data-testid="label-years">
                <span>כמות שנים</span>
                <Calendar className="h-5 w-5 text-green-500 animate-pulse" />
              </Label>
              <Select value={years} onValueChange={setYears} disabled={!projectType}>
                <SelectTrigger className="w-full p-3 border-2 border-green-300 text-lg focus:border-green-500 hover:border-green-400 disabled:bg-gray-50 disabled:border-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-50 to-teal-50" data-testid="select-years">
                  <SelectValue placeholder="בחר כמות שנים" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()} data-testid={`option-years-${year}`}>
                      {year} שנים
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Certificate Quantity */}
            <div>
              <Label className="text-lg font-semibold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-3 block text-right flex items-center gap-2 justify-end" data-testid="label-certificates">
                <span>כמות תעודות</span>
                <Award className="h-5 w-5 text-yellow-500 animate-spin" style={{animationDuration: '3s'}} />
              </Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={certificates}
                onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                className="w-full p-3 border-2 border-yellow-300 text-lg focus:border-yellow-500 hover:border-yellow-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-yellow-50 to-orange-50"
                data-testid="input-certificates"
              />
            </div>

            {/* Backup Certificates */}
            <div>
              <Label className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-3 block text-right flex items-center gap-2 justify-end" data-testid="label-backup-certificates">
                <span>תעודות גיבוי</span>
                <Shield className="h-5 w-5 text-emerald-500 animate-bounce" style={{animationDuration: '2.5s'}} />
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={backupCertificates}
                onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                className="w-full p-3 border-2 border-emerald-300 text-lg focus:border-emerald-500 hover:border-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-emerald-50 to-green-50"
                data-testid="input-backup-certificates"
              />
            </div>
          </div>

          {/* Price Display */}
          <div className="mt-8 p-6 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-xl border-2 border-transparent shadow-2xl relative overflow-hidden" style={{background: 'linear-gradient(135deg, #fce7f3, #e0e7ff, #dbeafe)'}}>
            {/* Animated sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-2 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="absolute top-6 left-6 w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{animationDuration: '1.5s'}}></div>
              <div className="absolute bottom-4 right-8 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDuration: '2s'}}></div>
            </div>
            <div className="text-center relative z-10">
              <p className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 font-bold" data-testid="label-final-price">מחיר סופי</p>
              <div className="bg-gradient-to-r from-white to-gray-50 rounded-lg p-4 shadow-xl border-2 border-transparent" style={{background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6) border-box'}}>
                <p className="text-4xl font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse" data-testid="text-total-price">
                  ₪{calculationResult?.totalPrice?.toLocaleString() || 0}
                </p>
              </div>
              {calculationResult?.discountInfo && (
                <p className="text-sm text-gray-600 mt-3 font-medium" data-testid="text-discount-info">
                  {calculationResult.discountInfo}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-black">
            <p className="font-medium" data-testid="text-company">Comsign 2025</p>
            <p className="text-xs text-black" data-testid="text-developer">NadavT</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
