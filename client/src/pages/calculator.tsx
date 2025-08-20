import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Hooks & Utils
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Icons
import { 
  Settings, Building, Calendar, Award, Shield, 
  User, Scale, Wrench, GraduationCap, Briefcase, 
  Star, Heart, Home, Car, Plane, Camera, Music, 
  Book, Coffee, Calculator as CalcIcon, Stethoscope, Gavel, 
  FileText, Globe, Palette, Code, Zap
} from "lucide-react";

// Assets
import comsignLogo from "@assets/Comsign-logo_1755345203728.jpg";

// Icon mapping function
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Scale': return Scale;
    case 'Building': return Building;
    case 'Wrench': return Wrench;
    case 'GraduationCap': return GraduationCap;
    case 'CalcIcon': return CalcIcon;
    case 'Stethoscope': return Stethoscope;
    case 'Briefcase': return Briefcase;
    case 'Shield': return Shield;
    case 'Gavel': return Gavel;
    case 'FileText': return FileText;
    case 'Globe': return Globe;
    case 'Camera': return Camera;
    case 'Palette': return Palette;
    case 'Code': return Code;
    case 'Heart': return Heart;
    case 'Car': return Car;
    case 'Home': return Home;
    case 'Zap': return Zap;
    case 'Star': return Star;
    default: return User;
  }
};

// ===== TYPES =====
interface CalculationRequest {
  projectType: string;
  years: number;
  certificates: number;
  backupCertificates: number;
  includeToken?: boolean;
  dayOffset?: number;
}

interface CalculationResult {
  totalPrice: number;
  discountInfo?: string;
  tokenPrice?: number;
  tokenIncluded?: boolean;
  tokenDisclaimer?: string;
  dayOffsetInfo?: string;
  originalPrice?: number;
}

interface PricingConfig {
  id: string;
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
  icon: string;
  tokenPrice: number;
  tokenIncluded: string;
}

// ===== MAIN COMPONENT =====
export default function Calculator() {
  // ===== STATE =====
  const [projectType, setProjectType] = useState("");
  const [years, setYears] = useState("");
  const [certificates, setCertificates] = useState(1);
  const [backupCertificates, setBackupCertificates] = useState(0);
  const [includeToken, setIncludeToken] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayOffset, setDayOffset] = useState(0);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  
  // ===== HOOKS =====
  const { toast } = useToast();

  // ===== PROJECT TYPES CONFIGURATION =====
  const projectTypes = useMemo(() => [
    { value: "lawyers", label: "עורכי דין", icon: Scale },
    { value: "architects", label: "אדריכלים", icon: Building },
    { value: "engineers", label: "מהנדסים", icon: Wrench },
    { value: "magna", label: "מגנא", icon: GraduationCap },
    { value: "regular", label: "רגיל", icon: User }
  ], []);

  // ===== DATA FETCHING =====
  const { data: availableYears = [], isLoading: yearsLoading, error: yearsError } = useQuery<number[]>({
    queryKey: ["/api/pricing", projectType, "years"],
    enabled: !!projectType,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ===== MUTATIONS =====
  const calculateMutation = useMutation({
    mutationFn: async (data: CalculationRequest): Promise<CalculationResult> => {
      try {
        const res = await apiRequest("POST", "/api/calculate", data);
        return res.json();
      } catch (error) {
        console.error('Calculation error:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      setCalculationResult(result);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      setCalculationResult(null);
      toast({
        title: "שגיאה בחישוב",
        description: "אנא נסה שנית",
        variant: "destructive",
      });
    },
  });

  // Auto-calculate when inputs change with debounce for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (projectType && years && certificates > 0) {
          const parsedYears = parseInt(years);
          if (isNaN(parsedYears) || parsedYears <= 0) {
            setCalculationResult(null);
            return;
          }
          
          const data: CalculationRequest = {
            projectType,
            years: parsedYears,
            certificates,
            backupCertificates,
            includeToken,
            dayOffset,
          };
          calculateMutation.mutate(data);
        } else {
          setCalculationResult(null);
        }
      } catch (error) {
        console.error('Auto-calculation error:', error);
        setCalculationResult(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [projectType, years, certificates, backupCertificates, includeToken, dayOffset]);

  // Reset years when project type changes
  useEffect(() => {
    setYears("");
  }, [projectType]);

  // Calculate remaining days when dates change
  useEffect(() => {
    try {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          setDayOffset(0);
          return;
        }
        
        // Calculate remaining days from today to end date
        const diffTime = end.getTime() - today.getTime();
        const remainingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Set the remaining days (can be negative if expired, zero, or positive)
        setDayOffset(remainingDays > 0 ? remainingDays : 0);
      } else {
        setDayOffset(0);
      }
    } catch (error) {
      console.error('Date calculation error:', error);
      setDayOffset(0);
    }
  }, [startDate, endDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-2 sm:p-4 lg:p-6 xl:p-8" dir="rtl" lang="he">
      <div className="flex flex-col min-h-screen">
        <Card className="w-full max-w-md sm:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto shadow-2xl bg-white border-gray-200 border-2 rounded-2xl" dir="rtl">
          <CardContent className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 lg:space-y-8" dir="rtl">
            
            {/* Header Section */}
            <div className="space-y-4">
              {/* Top Row - Logo, Settings */}
              <div className="flex items-center justify-between mb-3">
                {/* Logo - Right Side */}
                <div className="flex-shrink-0">
                  <img 
                    src={comsignLogo} 
                    alt="Comsign Logo" 
                    className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 object-contain rounded-lg shadow-sm"
                    data-testid="logo-comsign"
                  />
                </div>
                
                {/* Settings Button - Left Side */}
                <div className="flex-shrink-0">
                  <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 p-2 h-16 w-auto px-4 sm:p-3 sm:h-20 sm:px-6 lg:h-24 lg:px-8 xl:h-28 xl:px-10 rounded-lg shadow-sm touch-manipulation hover:scale-105 active:scale-95 transition-transform cursor-pointer" 
                        data-testid="button-settings"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Settings className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 text-red-600" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg w-[98vw] max-h-[98vh] overflow-hidden" dir="rtl">
                      <div className="flex flex-col h-full max-h-[95vh]" dir="rtl">
                        <DialogHeader className="flex-shrink-0 pb-2">
                          <DialogTitle className="text-center text-lg sm:text-xl font-bold" dir="rtl">פאנל ניהול המערכת</DialogTitle>
                          <DialogDescription className="text-center text-sm text-gray-600">
                            ניהול תצורת מחירים ופרמטרים
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
                          {!isAdminLoggedIn ? (
                            <AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />
                          ) : (
                            <AdminPanel onLogout={() => setIsAdminLoggedIn(false)} />
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 p-2 sm:p-4 border-t">
                          <Button 
                            onClick={() => {
                              setIsAdminModalOpen(false);
                              setIsAdminLoggedIn(false);
                            }}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
                            data-testid="button-close-admin"
                          >
                            סגור
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Title - Center */}
              <div className="text-center mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800" dir="rtl" data-testid="title-main">
                  מחירון פרויקטים
                </h1>
              </div>
              
              {/* Decorative Line */}
              <div className="flex justify-center">
                <div className="w-20 sm:w-24 lg:w-32 xl:w-40 h-1 lg:h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"></div>
              </div>
            </div>

            {/* Calculator Form */}
            <div className="space-y-4 lg:space-y-6 xl:space-y-8">
              {/* Project Type Selection */}
              <div>
                <Label className="text-sm lg:text-base xl:text-lg font-semibold text-gray-700 mb-2 lg:mb-3 block text-right" dir="rtl" data-testid="label-project-type">
                  <span>סוג הפרויקט</span>
                </Label>
                <Select value={projectType} onValueChange={(value) => {
                  try {
                    setProjectType(value);
                  } catch (error) {
                    console.error('Error setting project type:', error);
                  }
                }} dir="rtl">
                  <SelectTrigger className="w-full p-4 lg:p-6 xl:p-8 border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400 text-base lg:text-lg xl:text-xl focus:border-gray-500 min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] touch-manipulation hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer" dir="rtl" data-testid="select-project-type">
                    <SelectValue placeholder="בחר סוג פרויקט" className="text-base text-gray-900" dir="rtl" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`} className="lg:py-3 xl:py-4">
                          <div className="flex items-center gap-2 lg:gap-3 justify-end" style={{direction: 'rtl'}}>
                            <span className="text-base lg:text-lg xl:text-xl">{type.label}</span>
                            <IconComponent className="h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-red-600" />
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Years Selection */}
              <div>
                <Label className="text-sm lg:text-base xl:text-lg font-semibold text-gray-700 mb-2 lg:mb-3 block text-right" dir="rtl" data-testid="label-years">
                  <span>כמות שנים</span>
                </Label>
                <Select value={years} onValueChange={(value) => {
                  try {
                    setYears(value);
                  } catch (error) {
                    console.error('Error setting years:', error);
                  }
                }} disabled={!projectType || yearsLoading} dir="rtl">
                  <SelectTrigger className="w-full p-4 lg:p-6 xl:p-8 border-2 border-gray-300 text-base lg:text-lg xl:text-xl focus:border-gray-500 hover:border-gray-400 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300 disabled:opacity-100 bg-white text-gray-900 min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] touch-manipulation hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer" dir="rtl" data-testid="select-years">
                    <SelectValue placeholder={yearsLoading ? "טוען..." : yearsError ? "שגיאה בטעינה" : "בחר כמות שנים"} className="text-base text-gray-900" dir="rtl" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-base lg:text-lg xl:text-xl lg:py-3 xl:py-4" data-testid={`option-years-${year}`}>
                        {year} שנים
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Certificate Quantity */}
              <div>
                <Label className="text-sm lg:text-base xl:text-lg font-semibold text-gray-700 mb-2 lg:mb-3 block text-right" dir="rtl" data-testid="label-certificates">
                  <span>כמות תעודות</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={certificates}
                  onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                  className="w-full p-4 lg:p-6 xl:p-8 border-2 border-gray-300 text-base lg:text-lg xl:text-xl focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] text-center touch-manipulation hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                  placeholder="כמות תעודות"
                  data-testid="input-certificates"
                  inputMode="numeric"
                />
              </div>

              {/* Backup Certificates */}
              <div>
                <Label className="text-sm lg:text-base xl:text-lg font-semibold text-gray-700 mb-2 lg:mb-3 block text-right" dir="rtl" data-testid="label-backup-certificates">
                  <span>תעודות גיבוי</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={backupCertificates}
                  onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                  className="w-full p-4 lg:p-6 xl:p-8 border-2 border-gray-300 text-base lg:text-lg xl:text-xl focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] lg:min-h-[64px] xl:min-h-[72px] text-center touch-manipulation hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                  placeholder="תעודות גיבוי"
                  data-testid="input-backup-certificates"
                  inputMode="numeric"
                />
              </div>

              {/* Token Selection - Show only if project has optional token */}
              {calculationResult && calculationResult.tokenPrice && (
                <div className="mt-4 lg:mt-6 xl:mt-8 p-4 lg:p-6 xl:p-8 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2 space-x-reverse" dir="rtl">
                    <Checkbox
                      id="include-token"
                      checked={includeToken}
                      onCheckedChange={(checked) => setIncludeToken(checked as boolean)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      data-testid="checkbox-include-token"
                    />
                    <Label 
                      htmlFor="include-token" 
                      className="text-sm lg:text-base xl:text-lg font-medium text-red-800 cursor-pointer select-none"
                      data-testid="label-include-token"
                    >
                      הוסף טוקן (₪{calculationResult.tokenPrice})
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Calculation Button */}
            <div className="mt-4 text-center">
              <Dialog open={isAdvancedModalOpen} onOpenChange={setIsAdvancedModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 px-6 lg:px-8 xl:px-10 py-2 lg:py-3 xl:py-4 rounded-lg font-semibold text-base lg:text-lg xl:text-xl min-h-[48px] lg:min-h-[56px] xl:min-h-[64px] touch-manipulation hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer" 
                    data-testid="button-advanced-calculation"
                  >
                    חישוב מתקדם
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-hidden" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center text-red-600" dir="rtl">
                      חישוב מתקדם - קיזוז ימי תוקף
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 text-center mt-2">
                      הזן תאריכי הנפקה ותום תוקף לחישוב זיכוי לפי ימים שנותרו
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 p-4" dir="rtl">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="start-date" className="text-sm font-medium text-gray-700 mb-1 block text-right">
                          תאריך הנפקת הכרטיס
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg text-center min-h-[48px]"
                          data-testid="input-start-date"
                          placeholder="לדוגמה: 12/06/2021"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="end-date" className="text-sm font-medium text-gray-700 mb-1 block text-right">
                          תאריך תום תוקף המקורי
                        </Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg text-center min-h-[48px]"
                          data-testid="input-end-date"
                          placeholder="לדוגמה: 12/06/2025"
                        />
                      </div>
                      
                      {startDate && endDate && (
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <p className="text-center text-blue-800 font-medium">
                            {dayOffset > 0 ? (
                              <>ימים שנותרו לתוקף: {dayOffset} ימים</>
                            ) : (
                              <>הכרטיס פג תוקף אך ניתן לבצע חישוב</>
                            )}
                          </p>
                          <p className="text-center text-blue-600 text-sm mt-1">
                            המחיר יחושב לפי הימים שנותרו מתאריך היום
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setIsAdvancedModalOpen(false)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[48px] font-semibold rounded-lg"
                        data-testid="button-apply-advanced"
                      >
                        החל חישוב
                      </Button>
                      <Button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                          setDayOffset(0);
                          setIsAdvancedModalOpen(false);
                        }}
                        variant="outline"
                        className="flex-1 min-h-[48px] font-semibold border-2 border-gray-300 hover:border-gray-400 rounded-lg"
                        data-testid="button-reset-advanced"
                      >
                        איפוס
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Price Display */}
            <div className="mt-4 sm:mt-6 lg:mt-8 xl:mt-10 p-4 sm:p-6 lg:p-8 xl:p-10 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 rounded-xl border-2 shadow-lg">
              <div className="text-center">
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-700 mb-3 lg:mb-4 xl:mb-5 font-semibold" dir="rtl" data-testid="label-final-price">מחיר סופי</p>
                <div className="bg-white border-gray-200 rounded-lg p-4 sm:p-6 lg:p-8 xl:p-10 shadow-lg border-2">
                  <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-red-600" dir="rtl" data-testid="text-total-price">
                    ₪{calculationResult?.totalPrice?.toLocaleString() || 0}
                  </p>
                </div>
                {calculationResult?.discountInfo && (
                  <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-600 mt-2 lg:mt-3 font-medium" data-testid="text-discount-info">
                    {calculationResult.discountInfo}
                  </p>
                )}
                {calculationResult?.tokenDisclaimer && (
                  <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-red-600 mt-2 lg:mt-3 font-medium" data-testid="text-token-disclaimer">
                    *{calculationResult.tokenDisclaimer}
                  </p>
                )}
                {calculationResult?.dayOffsetInfo && (
                  <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-blue-600 mt-2 lg:mt-3 font-medium" data-testid="text-day-offset-info">
                    *{calculationResult.dayOffsetInfo}
                  </p>
                )}
                {calculationResult?.originalPrice && calculationResult.originalPrice !== calculationResult.totalPrice && (
                  <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-500 mt-1 lg:mt-2 line-through" data-testid="text-original-price">
                    מחיר מקורי: ₪{calculationResult.originalPrice.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 sm:mt-6 lg:mt-8 xl:mt-10 text-center">
              <p className="font-medium text-gray-700 text-sm sm:text-base lg:text-lg xl:text-xl" dir="rtl" data-testid="text-company">Comsign 2025</p>
              <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-600" data-testid="text-developer">© Powered By NadavT</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Admin Login Component
function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!password.trim()) {
      toast({
        title: "שגיאה",
        description: "נא הזן סיסמה",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        toast({
          title: "התחברות מוצלחת",
          description: "ברוך הבא לפאנל הניהול",
        });
        onLoginSuccess();
        setPassword("");
      } else {
        toast({
          title: "שגיאת התחברות",
          description: "סיסמה לא נכונה",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "בעיה בהתחברות לשרת",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-3">
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="הזן סיסמה"
          className="text-center min-h-[56px] text-lg touch-manipulation active:scale-[0.98] transition-transform"
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          data-testid="input-admin-password"
        />
      </div>
      
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[56px] text-lg touch-manipulation active:scale-[0.98] transition-transform"
        data-testid="button-admin-login"
      >
        {isLoading ? "מתחבר..." : "התחבר"}
      </Button>
    </div>
  );
}

// Admin Panel Component
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // Load all pricing configurations
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/admin/configs');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הגדרות המחירים",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConfig = async (configId: string) => {
    try {
      const response = await fetch(`/api/admin/configs/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הפרויקט נמחק בהצלחה",
        });
        loadConfigs();
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את הפרויקט",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "בעיה בתקשורת עם השרת",
        variant: "destructive",
      });
    }
  };

  const updateConfig = async (configId: string, updates: Partial<PricingConfig>) => {
    try {
      const response = await fetch(`/api/admin/configs/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({
          title: "עדכון מוצלח",
          description: "המחירים עודכנו בהצלחה",
        });
        loadConfigs(); // Reload configs
        setEditingConfig(null);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את המחירים",
        variant: "destructive",
      });
    }
  };

  const createConfig = async (configs: { projectType: string; years: number; basePrice: number; backupCertificatePrice: number; icon?: string; tokenPrice?: number; tokenIncluded?: string }[]) => {
    try {
      // Create each configuration separately
      let successCount = 0;
      for (const config of configs) {
        const response = await fetch('/api/admin/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...config,
            tokenPrice: config.tokenPrice || 120,
            tokenIncluded: config.tokenIncluded || "optional"
          }),
        });
        
        if (response.ok) {
          successCount++;
        }
      }

      if (successCount === configs.length) {
        toast({
          title: "הצלחה",
          description: `${configs.length} הגדרות מחיר נוספו בהצלחה`,
        });
        loadConfigs();
        setShowAddForm(false);
      } else if (successCount > 0) {
        toast({
          title: "הצלחה חלקית",
          description: `${successCount} מתוך ${configs.length} הגדרות נוספו`,
        });
        loadConfigs();
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן להוסיף את ההגדרות",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "בעיה בתקשורת עם השרת",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">ניהול מחירים</h3>
        <p className="text-sm text-gray-600">כל שינוי ישפיע מיד על כל המשתמשים</p>
      </div>

      {/* Add New Project Button */}
      <div className="border-b pb-6 mb-6">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[60px] text-lg font-semibold touch-manipulation active:scale-[0.97] transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl"
          data-testid="button-add-project"
        >
{showAddForm ? "ביטול הוספה" : "הוסף פרויקט חדש"}
        </Button>
        
        {showAddForm && (
          <div className="mt-4">
            <AddConfigForm
              onSave={createConfig}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}
      </div>

      <div className="space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
        {configs.map((config) => (
          <div key={config.id} className="border-2 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                {config.icon && (() => {
                  const IconComponent = getIconComponent(config.icon);
                  return <IconComponent className="h-5 w-5 text-red-600" />;
                })()}
                <h4 className="font-semibold text-gray-800 text-lg">
                  {config.projectType} - {config.years} שנים
                </h4>
              </div>
              <div className="flex gap-3 justify-center sm:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingConfig(config)}
                  data-testid={`button-edit-${config.id}`}
                  className="flex-1 sm:flex-none min-h-[52px] px-6 font-medium touch-manipulation active:scale-[0.97] transition-all duration-200 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 hover:text-blue-800 rounded-lg"
                >
ערוך
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteConfig(String(config.id))}
                  data-testid={`button-delete-${config.id}`}
                  className="flex-1 sm:flex-none min-h-[52px] px-6 font-medium touch-manipulation active:scale-[0.97] transition-all duration-200 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg shadow-md"
                >
מחק
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base text-gray-700">
              <div className="text-center sm:text-right bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span className="font-medium">מחיר בסיס:</span>
                <span className="font-bold text-blue-700 mr-2">₪{config.basePrice}</span>
              </div>
              <div className="text-center sm:text-right bg-green-50 p-3 rounded-lg border border-green-200">
                <span className="font-medium">תעודה נוספת:</span>
                <span className="font-bold text-green-700 mr-2">₪{config.backupCertificatePrice}</span>
              </div>
              <div className="text-center sm:text-right bg-red-50 p-3 rounded-lg border border-red-200">
                <span className="font-medium">טוקן:</span>
                <span className="font-bold text-red-700 mr-2">₪{config.tokenPrice || 120}</span>
              </div>
              <div className="text-center sm:text-right bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <span className="font-medium">סטטוס טוקן:</span>
                <span className="font-bold text-yellow-700 mr-2">
                  {config.tokenIncluded === "true" ? "כלול" : 
                   config.tokenIncluded === "optional" ? "אופציונלי" : "לא זמין"}
                </span>
              </div>
            </div>

            {editingConfig?.id === config.id && (
              <EditConfigForm
                config={config}
                onSave={(updates) => updateConfig(String(config.id), updates)}
                onCancel={() => setEditingConfig(null)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="pt-6 border-t-2 mt-6">
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full min-h-[60px] text-lg font-semibold touch-manipulation active:scale-[0.97] transition-all duration-200 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 rounded-xl"
          data-testid="button-admin-logout"
        >
התנתק
        </Button>
      </div>
    </div>
  );
}

// Edit Config Form Component
function EditConfigForm({
  config,
  onSave,
  onCancel
}: {
  config: PricingConfig;
  onSave: (updates: Partial<PricingConfig>) => void;
  onCancel: () => void;
}) {
  const [basePrice, setBasePrice] = useState(config.basePrice);
  const [backupPrice, setBackupPrice] = useState(config.backupCertificatePrice);
  const [tokenPrice, setTokenPrice] = useState(config.tokenPrice || 120);
  const [tokenIncluded, setTokenIncluded] = useState(config.tokenIncluded || "optional");

  const handleSave = () => {
    onSave({
      basePrice: Number(basePrice),
      backupCertificatePrice: Number(backupPrice),
      tokenPrice: Number(tokenPrice),
      tokenIncluded: tokenIncluded,
    });
  };

  return (
    <div className="mt-3 p-3 sm:p-4 border rounded bg-white space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor={`base-price-${config.id}`} className="text-sm font-medium">מחיר בסיס</Label>
          <Input
            id={`base-price-${config.id}`}
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="mt-1 text-center"
            data-testid={`input-base-price-${config.id}`}
          />
        </div>
        
        <div>
          <Label htmlFor={`backup-price-${config.id}`} className="text-sm font-medium">מחיר תעודה נוספת</Label>
          <Input
            id={`backup-price-${config.id}`}
            type="number"
            value={backupPrice}
            onChange={(e) => setBackupPrice(Number(e.target.value))}
            className="mt-1 text-center"
            data-testid={`input-backup-price-${config.id}`}
          />
        </div>
      </div>
      
      {/* Token Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor={`token-price-${config.id}`} className="text-sm font-medium">מחיר טוקן</Label>
          <Input
            id={`token-price-${config.id}`}
            type="number"
            value={tokenPrice}
            onChange={(e) => setTokenPrice(Number(e.target.value))}
            className="mt-1 text-center"
            data-testid={`input-token-price-${config.id}`}
          />
        </div>
        
        <div>
          <Label htmlFor={`token-included-${config.id}`} className="text-sm font-medium">טוקן במחיר</Label>
          <select
            id={`token-included-${config.id}`}
            value={tokenIncluded}
            onChange={(e) => setTokenIncluded(e.target.value)}
            className="w-full p-2 border-2 border-gray-300 rounded-lg text-center min-h-[40px] font-medium touch-manipulation bg-white shadow-sm mt-1"
            data-testid={`select-token-included-${config.id}`}
          >
            <option value="optional">אופציונלי</option>
            <option value="true">כלול במחיר</option>
            <option value="false">לא זמין</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={handleSave}
          size="sm"
          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 min-h-[52px] font-semibold touch-manipulation active:scale-[0.97] transition-all duration-200 rounded-lg shadow-md"
          data-testid={`button-save-${config.id}`}
        >
שמור שינויים
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="outline"
          className="flex-1 min-h-[52px] font-semibold touch-manipulation active:scale-[0.97] transition-all duration-200 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg"
          data-testid={`button-cancel-${config.id}`}
        >
          בטל
        </Button>
      </div>
    </div>
  );
}

// Add Config Form Component
function AddConfigForm({
  onSave,
  onCancel
}: {
  onSave: (configs: { projectType: string; years: number; basePrice: number; backupCertificatePrice: number; icon?: string; tokenPrice?: number; tokenIncluded?: string }[]) => void;
  onCancel: () => void;
}) {
  const [projectType, setProjectType] = useState("");
  const [tokenPrice, setTokenPrice] = useState(120);
  const [tokenIncluded, setTokenIncluded] = useState("optional");
  const [icon, setIcon] = useState("User");
  const [yearConfigs, setYearConfigs] = useState<{year: number; basePrice: number; backupPrice: number}[]>([
    { year: 1, basePrice: 0, backupPrice: 0 }
  ]);

  const addYearConfig = () => {
    if (yearConfigs.length < 10) {
      const nextYear = Math.max(...yearConfigs.map(c => c.year)) + 1;
      setYearConfigs([...yearConfigs, { year: nextYear, basePrice: 0, backupPrice: 0 }]);
    }
  };

  const removeYearConfig = (index: number) => {
    if (yearConfigs.length > 1) {
      setYearConfigs(yearConfigs.filter((_, i) => i !== index));
    }
  };

  const updateYearConfig = (index: number, field: 'year' | 'basePrice' | 'backupPrice', value: number) => {
    const updated = [...yearConfigs];
    updated[index][field] = value;
    setYearConfigs(updated);
  };

  const handleSave = () => {
    if (!projectType.trim() || yearConfigs.length === 0) {
      return;
    }
    
    const configs = yearConfigs.map(config => ({
      projectType: projectType.trim(),
      years: config.year,
      basePrice: config.basePrice,
      backupCertificatePrice: config.backupPrice,
      icon: icon,
      tokenPrice: tokenPrice,
      tokenIncluded: tokenIncluded
    }));
    
    onSave(configs);
  };

  return (
    <div className="p-4 sm:p-6 border-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 space-y-4 sm:space-y-6 shadow-lg" dir="rtl">
      <h4 className="font-bold text-center text-gray-800 text-xl">הוספת פרויקט חדש</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="new-project-type" className="text-lg font-semibold text-gray-800 mb-2 block">סוג פרויקט</Label>
          <Input
            id="new-project-type"
            type="text"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            placeholder="למשל: עורכי דין"
            className="text-center min-h-[52px] text-lg font-semibold border-2 rounded-lg touch-manipulation active:scale-[0.98] transition-all duration-200"
            data-testid="input-new-project-type"
          />
        </div>
      </div>

      {/* Year Configurations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border-2 border-blue-200">
          <Label className="text-base font-semibold text-gray-800">הגדרות מחירים לשנים</Label>
          <Button
            type="button"
            onClick={addYearConfig}
            disabled={yearConfigs.length >= 10}
            size="sm"
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white min-h-[44px] px-4 font-semibold rounded-lg shadow-md active:scale-[0.97] transition-all duration-200"
          >
הוסף שנה
          </Button>
        </div>
        
        <div className="space-y-4 max-h-[320px] overflow-y-auto">
          {yearConfigs.map((config, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-white border-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">שנים</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={config.year}
                  onChange={(e) => updateYearConfig(index, 'year', Number(e.target.value))}
                  className="text-center min-h-[48px] font-semibold border-2 rounded-lg"
                  inputMode="numeric"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">מחיר בסיס</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.basePrice}
                  onChange={(e) => updateYearConfig(index, 'basePrice', Number(e.target.value))}
                  className="text-center min-h-[48px] font-semibold border-2 rounded-lg"
                  placeholder="₪"
                  inputMode="numeric"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">מחיר גיבוי</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.backupPrice}
                  onChange={(e) => updateYearConfig(index, 'backupPrice', Number(e.target.value))}
                  className="text-center min-h-[48px] font-semibold border-2 rounded-lg"
                  placeholder="₪"
                  inputMode="numeric"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() => removeYearConfig(index)}
                  disabled={yearConfigs.length <= 1}
                  size="sm"
                  variant="destructive"
                  className="w-full min-h-[48px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold rounded-lg shadow-md active:scale-[0.97] transition-all duration-200"
                >
הסר
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Token Configuration */}
      <div className="space-y-4 bg-white p-4 rounded-lg border-2 border-red-200">
        <Label className="text-lg font-semibold text-gray-800 mb-2 block">הגדרות טוקן</Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="token-price" className="text-sm font-medium text-gray-700 mb-1 block">מחיר טוקן</Label>
            <Input
              id="token-price"
              type="number"
              min="0"
              value={tokenPrice}
              onChange={(e) => setTokenPrice(Number(e.target.value))}
              className="text-center min-h-[48px] font-semibold border-2 rounded-lg"
              placeholder="₪"
              inputMode="numeric"
              data-testid="input-token-price"
            />
          </div>
          
          <div>
            <Label htmlFor="token-included" className="text-sm font-medium text-gray-700 mb-1 block">טוקן במחיר</Label>
            <select
              id="token-included"
              value={tokenIncluded}
              onChange={(e) => setTokenIncluded(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-center min-h-[48px] font-semibold touch-manipulation bg-white shadow-sm"
              data-testid="select-token-included"
            >
              <option value="optional">אופציונלי</option>
              <option value="true">כלול במחיר</option>
              <option value="false">לא זמין</option>
            </select>
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="new-icon" className="text-lg font-semibold text-gray-800 mb-2 block">סמל</Label>
        <select
          id="new-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-full p-4 border-2 border-gray-300 rounded-lg text-center min-h-[52px] text-lg font-semibold touch-manipulation active:scale-[0.98] transition-all duration-200 bg-white shadow-sm"
          data-testid="select-new-icon"
        >
          <option value="User">משתמש רגיל</option>
          <option value="Scale">עורכי דין</option>
          <option value="Building">אדריכלים</option>
          <option value="Wrench">מהנדסים</option>
          <option value="GraduationCap">מגנא</option>
          <option value="CalcIcon">רואי חשבון</option>
          <option value="Stethoscope">רופאים</option>
          <option value="Briefcase">עסקים</option>
          <option value="Shield">ביטוח</option>
          <option value="Gavel">בית משפט</option>
          <option value="FileText">מסמכים</option>
          <option value="Globe">יעוץ בינלאומי</option>
          <option value="Camera">צלמים</option>
          <option value="Palette">עיצוב גרפי</option>
          <option value="Code">תכנות</option>
          <option value="Heart">בריאות</option>
          <option value="Car">רכב</option>
          <option value="Home">נדלן</option>
          <option value="Zap">חשמל</option>
          <option value="Star">שירותי תחזוקה</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t-2 border-blue-200">
        <Button
          onClick={handleSave}
          disabled={!projectType.trim() || yearConfigs.length === 0}
          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white min-h-[56px] text-lg font-bold touch-manipulation active:scale-[0.97] transition-all duration-200 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-save-new-config"
        >
הוסף {yearConfigs.length} הגדרות מחיר
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 min-h-[56px] text-lg font-bold touch-manipulation active:scale-[0.97] transition-all duration-200 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl"
          data-testid="button-cancel-new-config"
        >
          בטל
        </Button>
      </div>
    </div>
  );
}