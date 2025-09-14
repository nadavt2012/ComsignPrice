import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
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
import { apiRequest, queryClient } from "@/lib/queryClient";

// Icons
import { 
  Settings, Building, Calendar, Award, Shield, 
  User, Scale, Wrench, GraduationCap, Briefcase, 
  Star, Heart, Home, Car, Plane, Camera, Music, 
  Book, Coffee, Calculator as CalcIcon, Stethoscope, Gavel, 
  FileText, Globe, Palette, Code, Zap, TrendingUp
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
    case 'TrendingUp': return TrendingUp;
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

// ===== ADMIN COMPONENTS =====
function AdminLogin({ onLoginSuccess }: { onLoginSuccess: (role: string) => void }) {
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
        const data = await response.json();
        toast({
          title: "התחברות מוצלחת",
          description: data.message || "ברוך הבא לפאנל הניהול",
        });
        onLoginSuccess(data.role || 'super_admin');
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
          className="text-center min-h-[56px] text-lg touch-manipulation cursor-pointer"
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          data-testid="input-admin-password"
        />
      </div>
      
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[56px] text-lg touch-manipulation cursor-pointer"
        data-testid="button-admin-login"
      >
        {isLoading ? "מתחבר..." : "התחבר"}
      </Button>
    </div>
  );
}

function AdminPanel({ role, onLogout }: { role: string; onLogout: () => void }) {
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // Use React Query for admin configs to sync with main screen
  const { data: configs = [], isLoading } = useQuery<PricingConfig[]>({
    queryKey: ["/api/pricing"],
    staleTime: 30 * 1000, // 30 seconds cache for better performance
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">פאנל ניהול - {role}</h3>
        <Button onClick={onLogout} variant="outline" size="sm">
          התנתק
        </Button>
      </div>
      
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="view">צפיה במחירים</TabsTrigger>
          <TabsTrigger value="add">הוסף מחיר</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view" className="space-y-4">
          {isLoading ? (
            <div className="text-center">טוען...</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {configs.map((config) => (
                <div key={config.id} className="border p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{config.projectType}</p>
                      <p className="text-sm text-gray-600">{config.years} שנים - ₪{config.basePrice}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingConfig(config)}
                      >
                        ערוך
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="add" className="space-y-4">
          <div className="text-center text-gray-600">
            הוספת מחיר חדש תבוא בגרסה הבאה
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
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
  const [adminRole, setAdminRole] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState("");
  
  // ===== HOOKS =====
  const { toast } = useToast();

  // ===== DYNAMIC PROJECT TYPES FROM DATABASE =====
  const { data: allConfigs = [] } = useQuery<PricingConfig[]>({
    queryKey: ["/api/pricing"],
    staleTime: 1000 * 60 * 5, // 5 minutes cache for much better performance
    gcTime: 1000 * 60 * 10, // 10 minutes cleanup
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  // Create unique project types from database
  const projectTypes = useMemo(() => {
    const uniqueProjects = new Map();
    
    allConfigs.forEach(config => {
      if (!uniqueProjects.has(config.projectType)) {
        const IconComponent = getIconComponent(config.icon);
        uniqueProjects.set(config.projectType, {
          value: config.projectType,
          label: config.projectType,
          icon: IconComponent
        });
      }
    });
    
    return Array.from(uniqueProjects.values());
  }, [allConfigs]);

  // ===== DATA FETCHING =====
  const { data: availableYears = [], isLoading: yearsLoading, error: yearsError } = useQuery<number[]>({
    queryKey: ["/api/pricing", projectType, "years"],
    enabled: !!projectType,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - longer for better performance
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

  // Auto-calculate when inputs change with optimized debounce
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
    }, 150); // Faster 150ms debounce for better UX

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
    <div className="main-container" dir="rtl" lang="he">
      <div className="content-wrapper p-1 sm:p-2 lg:p-4 xl:p-6">
        {/* Perfect centering for desktop - both horizontal and vertical */}
        <div className="flex justify-center items-center min-h-screen py-4">
          <Card className="premium-card w-full max-w-md sm:max-w-lg lg:max-w-xl xl:max-w-2xl" dir="rtl">
            <CardContent className="p-2 sm:p-3 lg:p-4 xl:p-6 space-y-2 sm:space-y-3 lg:space-y-3 xl:space-y-4" dir="rtl">
            
            {/* Header Section */}
            <div className="space-y-1">
              {/* Top Row - Logo, Settings */}
              <div className="flex items-center justify-between mb-1">
                {/* Logo - Right Side */}
                <div className="flex-shrink-0">
                  <img 
                    src={comsignLogo} 
                    alt="Comsign Logo" 
                    className="h-14 w-14 lg:h-12 lg:w-12 xl:h-14 xl:w-14 object-contain rounded-lg shadow-sm"
                    data-testid="logo-comsign"
                  />
                </div>
                
                {/* Admin Access Button - Left Side */}
                <div className="flex-shrink-0">
                  <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-14 w-14 lg:h-12 lg:w-12 xl:h-14 xl:w-14 rounded-lg shadow-sm touch-manipulation cursor-pointer flex items-center justify-center" 
                        data-testid="button-admin-access"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Settings className="h-6 w-6 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-red-600" />
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
                            <AdminLogin onLoginSuccess={(role: string) => {
                              setIsAdminLoggedIn(true);
                              setAdminRole(role);
                            }} />
                          ) : (
                            <AdminPanel 
                              role={adminRole}
                              onLogout={() => {
                                setIsAdminLoggedIn(false);
                                setAdminRole("");
                                setAdminPassword("");
                              }} 
                            />
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 p-2 sm:p-4 border-t">
                          <Button 
                            onClick={() => {
                              setIsAdminModalOpen(false);
                            }}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white min-h-[48px] touch-manipulation cursor-pointer"
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
              <div className="text-center mb-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800" dir="rtl" data-testid="title-main">
                  מחירון פרויקטים
                </h1>
              </div>
              
              {/* Decorative Line */}
              <div className="flex justify-center">
                <div className="w-20 sm:w-24 lg:w-32 xl:w-40 h-1 lg:h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"></div>
              </div>
            </div>

            {/* Calculator Form */}
            <div className="space-y-3 lg:space-y-1 xl:space-y-2">
              {/* Project Type Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-project-type">
                  <span>סוג הפרויקט</span>
                </Label>
                <Select value={projectType} onValueChange={(value) => {
                  try {
                    setProjectType(value);
                  } catch (error) {
                    console.error('Error setting project type:', error);
                  }
                }} dir="rtl">
                  <SelectTrigger className="w-full p-4 lg:p-3 xl:p-3 border border-gray-300 bg-white text-gray-900 hover:border-gray-400 text-lg lg:text-base xl:text-lg focus:border-gray-500 min-h-[56px] lg:min-h-[44px] xl:min-h-[48px] touch-manipulation cursor-pointer transition-all duration-150 ease-out" dir="rtl" data-testid="select-project-type">
                    <SelectValue placeholder="בחר סוג פרויקט" className="text-sm text-gray-900" dir="rtl" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] lg:max-h-[250px] xl:max-h-[280px] overflow-y-auto">
                    {projectTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`} className="py-3">
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
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-years">
                  <span>כמות שנים</span>
                </Label>
                <Select value={years} onValueChange={(value) => {
                  try {
                    setYears(value);
                  } catch (error) {
                    console.error('Error setting years:', error);
                  }
                }} disabled={!projectType || yearsLoading} dir="rtl">
                  <SelectTrigger className="w-full p-4 lg:p-3 xl:p-3 border border-gray-300 text-lg lg:text-base xl:text-lg focus:border-gray-500 hover:border-gray-400 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300 disabled:opacity-100 bg-white text-gray-900 min-h-[56px] lg:min-h-[44px] xl:min-h-[48px] touch-manipulation cursor-pointer transition-all duration-150 ease-out" dir="rtl" data-testid="select-years">
                    <SelectValue placeholder={yearsLoading ? "טוען..." : yearsError ? "שגיאה בטעינה" : "בחר כמות שנים"} className="text-sm text-gray-900" dir="rtl" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] lg:max-h-[180px] xl:max-h-[200px] overflow-y-auto">
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-base py-3" data-testid={`option-years-${year}`}>
                        {year} שנים
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Certificate Quantity */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-certificates">
                  <span>כמות תעודות</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={certificates}
                  onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                  className="w-full p-4 lg:p-2 xl:p-3 border border-gray-300 text-lg lg:text-base xl:text-lg focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] lg:min-h-[40px] xl:min-h-[44px] text-center touch-manipulation cursor-pointer"
                  placeholder="כמות תעודות"
                  data-testid="input-certificates"
                  inputMode="numeric"
                />
              </div>

              {/* Backup Certificates */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-backup-certificates">
                  <span>תעודות גיבוי</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={backupCertificates}
                  onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                  className="w-full p-4 lg:p-2 xl:p-3 border border-gray-300 text-lg lg:text-base xl:text-lg focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] lg:min-h-[40px] xl:min-h-[44px] text-center touch-manipulation cursor-pointer"
                  placeholder="תעודות גיבוי"
                  data-testid="input-backup-certificates"
                  inputMode="numeric"
                />
              </div>

              {/* Token Information */}
              {calculationResult && calculationResult.tokenPrice && (
                <div>
                  <div className="p-3 lg:p-3 xl:p-3 bg-red-50 border border-red-200 rounded-xl">
                    {calculationResult.tokenIncluded && calculationResult.tokenDisclaimer === "עלות טוקן כלולה במחיר" ? (
                      // Token is included in price - show info only
                      <div className="flex items-start gap-3 py-1" dir="rtl">
                        <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center mt-0.5 flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-red-800 leading-5" data-testid="text-token-included">
                          טוקן כלול במחיר (₪{calculationResult.tokenPrice})
                        </div>
                      </div>
                    ) : (
                      // Token is optional - show interactive checkbox
                      <div className="flex items-start gap-3 py-1" dir="rtl">
                        <Checkbox
                          id="include-token"
                          checked={includeToken}
                          onCheckedChange={(checked) => setIncludeToken(checked as boolean)}
                          className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 mt-0.5 w-5 h-5 flex-shrink-0"
                          data-testid="checkbox-include-token"
                        />
                        <Label 
                          htmlFor="include-token" 
                          className="text-sm font-semibold text-red-800 cursor-pointer select-none leading-5"
                          data-testid="label-include-token"
                        >
                          הוסף טוקן (₪{calculationResult.tokenPrice})
                        </Label>
                      </div>
                    )}
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
                    className="border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 px-6 lg:px-4 xl:px-5 py-3 lg:py-2 xl:py-2 rounded-lg font-semibold text-lg lg:text-base xl:text-lg min-h-[56px] lg:min-h-[40px] xl:min-h-[44px] touch-manipulation cursor-pointer" 
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
                  
                  <div className="space-y-2 p-2" dir="rtl">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="start-date" className="text-sm font-semibold text-gray-700 mb-2 block text-right">
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
                        <Label htmlFor="end-date" className="text-sm font-semibold text-gray-700 mb-2 block text-right">
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
            <div className="mt-1 sm:mt-2 lg:mt-2 xl:mt-3 p-2 sm:p-3 lg:p-3 xl:p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 rounded-xl border shadow-lg">
              <div className="text-center">
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base text-gray-700 mb-1 lg:mb-2 xl:mb-2 font-semibold" dir="rtl" data-testid="label-final-price">מחיר סופי</p>
                <div className="bg-white border-gray-200 rounded-lg p-2 sm:p-3 lg:p-3 xl:p-4 shadow-lg border">
                  <p className="text-xl sm:text-2xl lg:text-2xl xl:text-2xl font-bold text-red-600" dir="rtl" data-testid="text-total-price">
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
            <div className="mt-1 sm:mt-2 lg:mt-2 xl:mt-3 text-center">
              <p className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base xl:text-lg" dir="rtl" data-testid="text-company">Comsign 2025</p>
              <p className="text-xs sm:text-xs lg:text-sm xl:text-base text-gray-600" data-testid="text-developer">© Powered By NadavT</p>
              <p className="text-xs text-gray-400 mt-1" data-testid="text-version">v3.0.1 - {new Date().toLocaleDateString('he-IL')} - SW:{navigator.serviceWorker?.controller ? 'Active' : 'None'}</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}