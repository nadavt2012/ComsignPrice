import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, Building, Calendar, Award, Shield, 
  User, Scale, Wrench, GraduationCap, Briefcase, 
  Star, Heart, Home, Car, Plane, Camera, Music, 
  Book, Coffee
} from "lucide-react";
import comsignLogo from "@assets/Comsign-logo_1755345203728.jpg";

// Types
interface CalculationRequest {
  projectType: string;
  years: number;
  certificates: number;
  backupCertificates: number;
}

interface CalculationResult {
  totalPrice: number;
  discountInfo?: string;
}

interface PricingConfig {
  id: number;
  projectType: string;
  years: number;
  certificates: number;
  basePrice: number;
  backupPrice: number;
  discountRate: number;
  icon: string;
}

export default function Calculator() {
  const [projectType, setProjectType] = useState("");
  const [years, setYears] = useState("");
  const [certificates, setCertificates] = useState(1);
  const [backupCertificates, setBackupCertificates] = useState(0);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  
  const { toast } = useToast();

  const projectTypes = useMemo(() => [
    { value: "lawyers", label: "עורכי דין", icon: Scale },
    { value: "architects", label: "אדריכלים", icon: Building },
    { value: "engineers", label: "מהנדסים", icon: Wrench },
    { value: "magna", label: "מגנא", icon: GraduationCap },
    { value: "regular", label: "רגיל", icon: User }
  ], []);

  // Get available years for selected project type
  const { data: availableYears = [] } = useQuery<number[]>({
    queryKey: ["/api/pricing", projectType, "years"],
    enabled: !!projectType,
    staleTime: 5 * 60 * 1000,
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

  // Auto-calculate when inputs change with debounce for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 150);

    return () => clearTimeout(timer);
  }, [projectType, years, certificates, backupCertificates]);

  // Reset years when project type changes
  useEffect(() => {
    setYears("");
  }, [projectType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-3 sm:p-4 lg:p-6" dir="rtl" lang="he">
      <div className="flex flex-col min-h-screen">
        <Card className="w-full max-w-md mx-auto shadow-2xl bg-white border-gray-200 border-2 rounded-2xl" dir="rtl">
          <CardContent className="p-4 space-y-6" dir="rtl">
            
            {/* Header Section */}
            <div className="space-y-4">
              {/* Top Row - Logo, Settings */}
              <div className="flex items-center justify-between mb-3">
                {/* Logo - Right Side */}
                <div className="flex-shrink-0">
                  <img 
                    src={comsignLogo} 
                    alt="Comsign Logo" 
                    className="h-20 w-20 object-contain rounded-lg shadow-sm"
                    data-testid="logo-comsign"
                  />
                </div>
                
                {/* Settings Button - Left Side */}
                <div className="flex-shrink-0">
                  <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 p-4 h-20 w-20 rounded-lg shadow-sm touch-manipulation" 
                        data-testid="button-settings"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Settings className="h-8 w-8" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent 
                      className="w-[95vw] max-w-md h-[90vh] max-h-[600px] p-4 m-2" 
                      dir="rtl"
                      style={{ 
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9999
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold mb-4" dir="rtl">פאנל ניהול מערכת</DialogTitle>
                      </DialogHeader>
                      <div className="text-center p-4">
                        <p className="text-gray-600 mb-4">זהו פאנל הניהול של המערכת</p>
                        <Button 
                          onClick={() => setIsAdminModalOpen(false)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          סגור
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Title - Center */}
              <div className="text-center mb-2">
                <h1 className="text-2xl font-bold text-gray-800" dir="rtl" data-testid="title-main">
                  מחירון פרויקטים
                </h1>
              </div>
              
              {/* Decorative Line */}
              <div className="flex justify-center">
                <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"></div>
              </div>
            </div>

            {/* Calculator Form */}
            <div className="space-y-4">
              {/* Project Type Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-project-type">
                  <div className="flex items-center gap-2 justify-start">
                    <span>סוג הפרויקט</span>
                    <Building className="h-4 w-4 text-red-500" />
                  </div>
                </Label>
                <Select value={projectType} onValueChange={setProjectType} dir="rtl">
                  <SelectTrigger className="w-full p-3 border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400 text-base focus:border-gray-500 min-h-[50px]" dir="rtl" data-testid="select-project-type">
                    <SelectValue placeholder="בחר סוג פרויקט" className="text-base text-gray-900" dir="rtl" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`}>
                          <div className="flex items-center gap-2 justify-end" style={{direction: 'rtl'}}>
                            <span className="text-base">{type.label}</span>
                            <IconComponent className="h-4 w-4 text-red-500" />
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Years Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-years">
                  <div className="flex items-center gap-2 justify-start">
                    <span>כמות שנים</span>
                    <Calendar className="h-4 w-4 text-red-500" />
                  </div>
                </Label>
                <Select value={years} onValueChange={setYears} disabled={!projectType} dir="rtl">
                  <SelectTrigger className="w-full p-3 border-2 border-gray-300 text-base focus:border-gray-500 hover:border-gray-400 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300 disabled:opacity-100 bg-white text-gray-900 min-h-[50px]" dir="rtl" data-testid="select-years">
                    <SelectValue placeholder="בחר כמות שנים" className="text-base text-gray-900" dir="rtl" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-base" data-testid={`option-years-${year}`}>
                        {year} שנים
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Certificate Quantity */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-certificates">
                  <div className="flex items-center gap-2 justify-start">
                    <span>כמות תעודות</span>
                    <Award className="h-4 w-4 text-red-500" />
                  </div>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={certificates}
                  onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border-2 border-gray-300 text-base focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[50px]"
                  dir="rtl"
                  style={{direction: 'rtl', textAlign: 'right'}}
                  data-testid="input-certificates"
                  inputMode="numeric"
                />
              </div>

              {/* Backup Certificates */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-backup-certificates">
                  <div className="flex items-center gap-2 justify-start">
                    <span>תעודות גיבוי</span>
                    <Shield className="h-4 w-4 text-red-500" />
                  </div>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={backupCertificates}
                  onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                  className="w-full p-3 border-2 border-gray-300 text-base focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[50px]"
                  dir="rtl"
                  style={{direction: 'rtl', textAlign: 'right'}}
                  data-testid="input-backup-certificates"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Price Display */}
            <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 rounded-xl border-2 shadow-lg">
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-2 font-semibold" dir="rtl" data-testid="label-final-price">מחיר סופי</p>
                <div className="bg-white border-gray-200 rounded-lg p-4 shadow-lg border-2">
                  <p className="text-2xl font-bold text-red-600" dir="rtl" data-testid="text-total-price">
                    ₪{calculationResult?.totalPrice?.toLocaleString() || 0}
                  </p>
                </div>
                {calculationResult?.discountInfo && (
                  <p className="text-xs text-gray-600 mt-2 font-medium" data-testid="text-discount-info">
                    {calculationResult.discountInfo}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="font-medium text-gray-700" dir="rtl" data-testid="text-company">Comsign 2025</p>
              <p className="text-sm text-gray-600" data-testid="text-developer">Developed By NadavT</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}