import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// ===== TYPES =====
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
  id: string;
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
  icon: string;
}

// ===== MAIN COMPONENT =====
export default function Calculator() {
  // ===== STATE =====
  const [projectType, setProjectType] = useState("");
  const [years, setYears] = useState("");
  const [certificates, setCertificates] = useState(1);
  const [backupCertificates, setBackupCertificates] = useState(0);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
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
  const { data: availableYears = [] } = useQuery<number[]>({
    queryKey: ["/api/pricing", projectType, "years"],
    enabled: !!projectType,
    staleTime: 5 * 60 * 1000,
  });

  // ===== MUTATIONS =====
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-2 sm:p-4 lg:p-6" dir="rtl" lang="he">
      <div className="flex flex-col min-h-screen">
        <Card className="w-full max-w-md mx-auto shadow-2xl bg-white border-gray-200 border-2 rounded-2xl" dir="rtl">
          <CardContent className="p-3 sm:p-4 space-y-4 sm:space-y-6" dir="rtl">
            
            {/* Header Section */}
            <div className="space-y-4">
              {/* Top Row - Logo, Settings */}
              <div className="flex items-center justify-between mb-3">
                {/* Logo - Right Side */}
                <div className="flex-shrink-0">
                  <img 
                    src={comsignLogo} 
                    alt="Comsign Logo" 
                    className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-lg shadow-sm"
                    data-testid="logo-comsign"
                  />
                </div>
                
                {/* Settings Button - Left Side */}
                <div className="flex-shrink-0">
                  <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 p-3 h-16 w-16 sm:p-4 sm:h-20 sm:w-20 rounded-lg shadow-sm touch-manipulation active:scale-95 transition-transform" 
                        data-testid="button-settings"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg w-[98vw] max-h-[98vh] overflow-hidden" dir="rtl">
                      <div className="flex flex-col h-full max-h-[95vh]" dir="rtl">
                        <DialogHeader className="flex-shrink-0 pb-2">
                          <DialogTitle className="text-center text-lg sm:text-xl font-bold" dir="rtl">פאנל ניהול מערכת</DialogTitle>
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800" dir="rtl" data-testid="title-main">
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
                  <SelectTrigger className="w-full p-4 border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400 text-base focus:border-gray-500 min-h-[56px] touch-manipulation active:scale-[0.98] transition-transform" dir="rtl" data-testid="select-project-type">
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
                  <SelectTrigger className="w-full p-4 border-2 border-gray-300 text-base focus:border-gray-500 hover:border-gray-400 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300 disabled:opacity-100 bg-white text-gray-900 min-h-[56px] touch-manipulation active:scale-[0.98] transition-transform" dir="rtl" data-testid="select-years">
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
                  className="w-full p-4 border-2 border-gray-300 text-base focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] text-center touch-manipulation active:scale-[0.98] transition-transform"
                  placeholder="כמות תעודות"
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
                  className="w-full p-4 border-2 border-gray-300 text-base focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] text-center touch-manipulation active:scale-[0.98] transition-transform"
                  placeholder="תעודות גיבוי"
                  data-testid="input-backup-certificates"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Price Display */}
            <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 rounded-xl border-2 shadow-lg">
              <div className="text-center">
                <p className="text-sm sm:text-base text-gray-700 mb-3 font-semibold" dir="rtl" data-testid="label-final-price">מחיר סופי</p>
                <div className="bg-white border-gray-200 rounded-lg p-4 sm:p-6 shadow-lg border-2">
                  <p className="text-3xl sm:text-4xl font-bold text-red-600" dir="rtl" data-testid="text-total-price">
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
            <div className="mt-4 sm:mt-6 text-center">
              <p className="font-medium text-gray-700 text-sm sm:text-base" dir="rtl" data-testid="text-company">Comsign 2025</p>
              <p className="text-xs sm:text-sm text-gray-600" data-testid="text-developer">Developed By NadavT</p>
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
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">התחברות לפאנל הניהול</h3>
        <p className="text-sm text-gray-600 mt-2">הזן את סיסמת המנהל</p>
      </div>
      
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

  const createConfig = async (configs: { projectType: string; years: number; basePrice: number; backupCertificatePrice: number; icon?: string }[]) => {
    try {
      // Create each configuration separately
      let successCount = 0;
      for (const config of configs) {
        const response = await fetch('/api/admin/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
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
      <div className="border-b pb-4">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[56px] text-base sm:text-lg touch-manipulation active:scale-[0.98] transition-transform"
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

      <div className="space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
        {configs.map((config) => (
          <div key={config.id} className="border rounded-lg p-3 sm:p-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
              <h4 className="font-medium text-gray-800 text-center sm:text-right">
                {config.projectType} - {config.years} שנים
              </h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingConfig(config)}
                  data-testid={`button-edit-${config.id}`}
                  className="flex-1 sm:flex-none min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
                >
                  ערוך
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteConfig(String(config.id))}
                  data-testid={`button-delete-${config.id}`}
                  className="flex-1 sm:flex-none min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform bg-red-600 hover:bg-red-700"
                >
                  מחק
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="text-center sm:text-right">מחיר בסיס: ₪{config.basePrice}</div>
              <div className="text-center sm:text-right">תעודה נוספת: ₪{config.backupCertificatePrice}</div>
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

      <div className="pt-4 border-t">
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full min-h-[56px] text-base touch-manipulation active:scale-[0.98] transition-transform"
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

  const handleSave = () => {
    onSave({
      basePrice: Number(basePrice),
      backupCertificatePrice: Number(backupPrice),
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
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleSave}
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
          data-testid={`button-save-${config.id}`}
        >
          שמור
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="outline"
          className="flex-1 min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
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
  onSave: (configs: { projectType: string; years: number; basePrice: number; backupCertificatePrice: number; icon?: string }[]) => void;
  onCancel: () => void;
}) {
  const [projectType, setProjectType] = useState("");
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
      icon: icon
    }));
    
    onSave(configs);
  };

  return (
    <div className="p-3 sm:p-4 border rounded-lg bg-blue-50 space-y-3 sm:space-y-4" dir="rtl">
      <h4 className="font-semibold text-center text-gray-800">הוספת פרויקט חדש</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="new-project-type" className="text-sm font-medium">סוג פרויקט</Label>
          <Input
            id="new-project-type"
            type="text"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            placeholder="למשל: עורכי דין"
            className="mt-1 text-center min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
            data-testid="input-new-project-type"
          />
        </div>
      </div>

      {/* Year Configurations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">הגדרות מחירים לשנים</Label>
          <Button
            type="button"
            onClick={addYearConfig}
            disabled={yearConfigs.length >= 10}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white min-h-[40px]"
          >
            הוסף שנה
          </Button>
        </div>
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {yearConfigs.map((config, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-white border rounded-lg">
              <div>
                <Label className="text-xs text-gray-600">שנים</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={config.year}
                  onChange={(e) => updateYearConfig(index, 'year', Number(e.target.value))}
                  className="text-center min-h-[40px]"
                  inputMode="numeric"
                />
              </div>
              
              <div>
                <Label className="text-xs text-gray-600">מחיר בסיס</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.basePrice}
                  onChange={(e) => updateYearConfig(index, 'basePrice', Number(e.target.value))}
                  className="text-center min-h-[40px]"
                  placeholder="₪"
                  inputMode="numeric"
                />
              </div>
              
              <div>
                <Label className="text-xs text-gray-600">מחיר גיבוי</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.backupPrice}
                  onChange={(e) => updateYearConfig(index, 'backupPrice', Number(e.target.value))}
                  className="text-center min-h-[40px]"
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
                  className="w-full min-h-[40px] bg-red-600 hover:bg-red-700"
                >
                  הסר
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <Label htmlFor="new-icon" className="text-sm font-medium">סמל</Label>
        <select
          id="new-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-full mt-1 p-3 border-2 border-gray-300 rounded-md text-center min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform bg-white"
          data-testid="select-new-icon"
        >
          <option value="User">👤 משתמש רגיל</option>
          <option value="Scale">עורכי דין</option>
          <option value="Building">אדריכלים</option>
          <option value="Wrench">מהנדסים</option>
          <option value="GraduationCap">מגנה</option>
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
      
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={!projectType.trim() || yearConfigs.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
          data-testid="button-save-new-config"
        >
          הוסף {yearConfigs.length} הגדרות מחיר
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform"
          data-testid="button-cancel-new-config"
        >
          בטל
        </Button>
      </div>
    </div>
  );
}