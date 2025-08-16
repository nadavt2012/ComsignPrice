import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Scale, Building, Wrench, GraduationCap, User } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl relative bg-white/90 backdrop-blur-sm border-red-100">
        <CardContent className="p-8">
          {/* Header with Logo and Settings */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {/* Logo on the right */}
              <div className="flex-shrink-0">
                <img 
                  src={comsignLogo} 
                  alt="Comsign Logo" 
                  className="h-12 w-auto object-contain"
                  data-testid="logo-comsign"
                />
              </div>
              
              {/* Settings button on the left */}
              <div>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300" data-testid="button-settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-2" data-testid="title-main">
                מחירון פרויקט
              </h1>
              <div className="w-20 h-1.5 bg-gradient-to-r from-red-500 to-red-700 mx-auto rounded-full shadow-sm"></div>
            </div>
          </div>

          {/* Calculator Form */}
          <div className="space-y-6">
            {/* Project Type Selection */}
            <div>
              <Label className="text-lg font-semibold text-red-700 mb-3 block" data-testid="label-project-type">
                סוג הפרויקט
              </Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger className="w-full p-3 border-2 border-red-200 text-lg focus:border-red-500 hover:border-red-300 transition-colors" data-testid="select-project-type">
                  <SelectValue placeholder="בחר סוג פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-primary" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Years Selection */}
            <div>
              <Label className="text-lg font-semibold text-red-700 mb-3 block" data-testid="label-years">
                כמות שנים
              </Label>
              <Select value={years} onValueChange={setYears} disabled={!projectType}>
                <SelectTrigger className="w-full p-3 border-2 border-red-200 text-lg focus:border-red-500 hover:border-red-300 disabled:bg-red-50 disabled:border-red-100 transition-colors" data-testid="select-years">
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
              <Label className="text-lg font-semibold text-red-700 mb-3 block" data-testid="label-certificates">
                כמות תעודות
              </Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={certificates}
                onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                className="w-full p-3 border-2 border-red-200 text-lg focus:border-red-500 hover:border-red-300 transition-colors"
                data-testid="input-certificates"
              />
            </div>

            {/* Backup Certificates */}
            <div>
              <Label className="text-lg font-semibold text-red-700 mb-3 block" data-testid="label-backup-certificates">
                תעודות גיבוי
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={backupCertificates}
                onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                className="w-full p-3 border-2 border-red-200 text-lg focus:border-red-500 hover:border-red-300 transition-colors"
                data-testid="input-backup-certificates"
              />
            </div>
          </div>

          {/* Price Display */}
          <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200 shadow-inner">
            <div className="text-center">
              <p className="text-lg text-red-700 mb-3 font-medium" data-testid="label-final-price">מחיר סופי</p>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100">
                <p className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent" data-testid="text-total-price">
                  ₪{calculationResult?.totalPrice?.toLocaleString() || 0}
                </p>
              </div>
              {calculationResult?.discountInfo && (
                <p className="text-sm text-red-600 mt-3 font-medium" data-testid="text-discount-info">
                  {calculationResult.discountInfo}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-red-600">
            <p className="font-medium" data-testid="text-company">Comsign 2025</p>
            <p className="text-xs text-red-500" data-testid="text-developer">NadavT</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
