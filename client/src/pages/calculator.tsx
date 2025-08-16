import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit, Settings, Scale, Building, Wrench, GraduationCap, User, Calendar, Award, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CalculationRequest, CalculationResult, PricingConfig, AdminLoginRequest, AdminConfigUpdate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import comsignLogo from "@assets/Comsign-logo_1755345203728.jpg";

export default function Calculator() {
  const [projectType, setProjectType] = useState<string>("");
  const [years, setYears] = useState<string>("");
  const [certificates, setCertificates] = useState<number>(1);
  const [backupCertificates, setBackupCertificates] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  
  // Admin modal states
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [newConfig, setNewConfig] = useState<AdminConfigUpdate>({ projectType: "", years: 1, basePrice: 0, backupCertificatePrice: 0 });
  const [passwordChange, setPasswordChange] = useState({ currentPassword: "", newPassword: "" });
  
  const { toast } = useToast();

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

  // Get all pricing configs for admin
  const { data: allPricingConfigs = [], refetch: refetchConfigs } = useQuery<PricingConfig[]>({
    queryKey: ["/api/admin/pricing"],
    enabled: isAdminLoggedIn,
  });

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/admin/login", { password });
      return res.json();
    },
    onSuccess: () => {
      setIsAdminLoggedIn(true);
      setAdminPassword("");
      toast({ title: "התחברות הצליחה", description: "ברוך הבא לפאנל הניהול" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "סיסמה שגויה", variant: "destructive" });
    },
  });

  // Create pricing config mutation
  const createConfigMutation = useMutation({
    mutationFn: async (config: AdminConfigUpdate) => {
      const res = await apiRequest("POST", "/api/admin/pricing", config);
      return res.json();
    },
    onSuccess: () => {
      refetchConfigs();
      setNewConfig({ projectType: "", years: 1, basePrice: 0, backupCertificatePrice: 0 });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({ title: "הצלחה", description: "תצורה חדשה נוצרה" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "שגיאה ביצירת תצורה", variant: "destructive" });
    },
  });

  // Update pricing config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: AdminConfigUpdate }) => {
      const res = await apiRequest("PUT", `/api/admin/pricing/${id}`, config);
      return res.json();
    },
    onSuccess: () => {
      refetchConfigs();
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      setEditingConfig(null);
      toast({ title: "הצלחה", description: "תצורה עודכנה" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "שגיאה בעדכון תצורה", variant: "destructive" });
    },
  });

  // Delete pricing config mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/pricing/${id}`);
      return res.json();
    },
    onSuccess: () => {
      refetchConfigs();
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({ title: "הצלחה", description: "תצורה נמחקה" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "שגיאה במחיקת תצורה", variant: "destructive" });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwords: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/admin/change-password", passwords);
      return res.json();
    },
    onSuccess: () => {
      setPasswordChange({ currentPassword: "", newPassword: "" });
      toast({ title: "הצלחה", description: "סיסמה שונתה בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "שגיאה בשינוי סיסמה", variant: "destructive" });
    },
  });

  const AdminModal = () => {
    if (!isAdminLoggedIn) {
      return (
        <div className="p-6 text-center" dir="rtl">
          <h3 className="text-lg font-semibold mb-4" style={{direction: 'rtl'}}>התחברות אדמין</h3>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="הכנס סיסמה"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              dir="rtl"
              style={{direction: 'rtl', textAlign: 'right'}}
            />
            <Button 
              onClick={() => adminLoginMutation.mutate(adminPassword)}
              disabled={adminLoginMutation.isPending}
              className="w-full"
            >
              {adminLoginMutation.isPending ? "מתחבר..." : "התחבר"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div dir="rtl">
        <Tabs defaultValue="manage" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">ניהול מחירים</TabsTrigger>
            <TabsTrigger value="settings">הגדרות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manage" className="mt-4">
            <div className="space-y-6">
              {/* Add New Configuration */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4" style={{direction: 'rtl'}}>הוספת תצורה חדשה</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label style={{direction: 'rtl'}}>סוג פרויקט</Label>
                      <Input
                        value={newConfig.projectType}
                        onChange={(e) => setNewConfig({...newConfig, projectType: e.target.value})}
                        placeholder="למשל: עורכי דין"
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label style={{direction: 'rtl'}}>שנים</Label>
                      <Input
                        type="number"
                        value={newConfig.years}
                        onChange={(e) => setNewConfig({...newConfig, years: parseInt(e.target.value) || 1})}
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label style={{direction: 'rtl'}}>מחיר תעודה רגילה</Label>
                      <Input
                        type="number"
                        value={newConfig.basePrice}
                        onChange={(e) => setNewConfig({...newConfig, basePrice: parseFloat(e.target.value) || 0})}
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label style={{direction: 'rtl'}}>מחיר תעודת גיבוי</Label>
                      <Input
                        type="number"
                        value={newConfig.backupCertificatePrice}
                        onChange={(e) => setNewConfig({...newConfig, backupCertificatePrice: parseFloat(e.target.value) || 0})}
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label style={{direction: 'rtl'}}>סה"כ מחירים</Label>
                      <div className="p-3 bg-gray-100 rounded border text-center font-bold text-green-600" style={{direction: 'rtl'}}>
                        ₪{(newConfig.basePrice + newConfig.backupCertificatePrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      createConfigMutation.mutate(newConfig);
                      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
                    }}
                    className="mt-4 w-full"
                    disabled={!newConfig.projectType || createConfigMutation.isPending}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    {createConfigMutation.isPending ? "יוצר..." : "הוסף תצורה"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Configurations */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4" style={{direction: 'rtl'}}>תצורות קיימות</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allPricingConfigs.map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingConfig?.id === config.id ? (
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="סוג פרויקט"
                                value={editingConfig.projectType}
                                onChange={(e) => setEditingConfig({...editingConfig, projectType: e.target.value})}
                                dir="rtl"
                                style={{direction: 'rtl', textAlign: 'right'}}
                              />
                              <Input
                                placeholder="שנים"
                                type="number"
                                value={editingConfig.years}
                                onChange={(e) => setEditingConfig({...editingConfig, years: parseInt(e.target.value) || 1})}
                                dir="rtl"
                                style={{direction: 'rtl', textAlign: 'right'}}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="מחיר רגיל"
                                type="number"
                                value={editingConfig.basePrice}
                                onChange={(e) => setEditingConfig({...editingConfig, basePrice: parseFloat(e.target.value) || 0})}
                                dir="rtl"
                                style={{direction: 'rtl', textAlign: 'right'}}
                              />
                              <Input
                                placeholder="מחיר גיבוי"
                                type="number"
                                value={editingConfig.backupCertificatePrice}
                                onChange={(e) => setEditingConfig({...editingConfig, backupCertificatePrice: parseFloat(e.target.value) || 0})}
                                dir="rtl"
                                style={{direction: 'rtl', textAlign: 'right'}}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  updateConfigMutation.mutate({ id: config.id, config: editingConfig });
                                  queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
                                }}
                                disabled={updateConfigMutation.isPending}
                                className="flex-1"
                              >
                                שמור
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingConfig(null)} className="flex-1">
                                בטל
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-right flex-1 space-y-1" style={{direction: 'rtl'}}>
                              <div>
                                <span className="font-bold text-lg">{config.projectType}</span> - 
                                <span className="text-gray-600">{config.years} שנים</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-blue-600">תעודה רגילה: ₪{config.basePrice}</span> | 
                                <span className="text-orange-600">תעודת גיבוי: ₪{config.backupCertificatePrice}</span>
                              </div>
                              <div className="font-bold text-green-600">
                                סה"כ: ₪{(config.basePrice + config.backupCertificatePrice).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingConfig(config)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  deleteConfigMutation.mutate(config.id);
                                  queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
                                }}
                                disabled={deleteConfigMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-4" style={{direction: 'rtl'}}>שינוי סיסמה</h4>
                <div className="space-y-4">
                  <div>
                    <Label style={{direction: 'rtl'}}>סיסמה נוכחית</Label>
                    <Input
                      type="password"
                      value={passwordChange.currentPassword}
                      onChange={(e) => setPasswordChange({...passwordChange, currentPassword: e.target.value})}
                      dir="rtl"
                      style={{direction: 'rtl', textAlign: 'right'}}
                    />
                  </div>
                  <div>
                    <Label style={{direction: 'rtl'}}>סיסמה חדשה</Label>
                    <Input
                      type="password"
                      value={passwordChange.newPassword}
                      onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
                      dir="rtl"
                      style={{direction: 'rtl', textAlign: 'right'}}
                    />
                  </div>
                  <Button 
                    onClick={() => changePasswordMutation.mutate(passwordChange)}
                    disabled={!passwordChange.currentPassword || !passwordChange.newPassword || changePasswordMutation.isPending}
                    className="w-full"
                  >
                    {changePasswordMutation.isPending ? "משנה..." : "שנה סיסמה"}
                  </Button>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setIsAdminLoggedIn(false);
                      setIsAdminModalOpen(false);
                    }}
                  >
                    התנתק
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" lang="he" style={{fontFamily: 'system-ui, -apple-system, sans-serif', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed'}}>
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/4 -left-20 w-60 h-60 bg-gradient-to-br from-pink-400/15 to-red-400/15 rounded-full animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/25 to-orange-400/25 rounded-full animate-ping" style={{animationDuration: '4s'}}></div>
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full animate-pulse" style={{animationDuration: '2s'}}></div>
      </div>
      <Card className="w-full max-w-md shadow-2xl relative bg-white/90 backdrop-blur-sm border-2 border-transparent bg-clip-padding" dir="rtl" style={{direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed', background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6) border-box'}}>
        <CardContent className="p-8" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}}>
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
                <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="border-2 border-red-300 text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border-red-400 p-4 transition-all duration-300 shadow-lg hover:shadow-xl animate-pulse" data-testid="button-settings">
                      <Settings className="h-4 w-4 text-red-500 animate-spin" style={{animationDuration: '4s'}} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-center text-xl font-bold" dir="rtl" style={{direction: 'rtl'}}>פאנל ניהול מערכת</DialogTitle>
                    </DialogHeader>
                    {AdminModal()}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2" dir="rtl" style={{direction: 'rtl', textAlign: 'center'}} data-testid="title-main">
                מחירון פרויקטים
              </h1>
              <div className="w-20 h-1.5 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 mx-auto rounded-full shadow-lg animate-pulse"></div>
            </div>
          </div>

          {/* Calculator Form */}
          <div className="space-y-6">
            {/* Project Type Selection */}
            <div>
              <Label className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 block flex items-center gap-2 justify-end" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-project-type">
                <span>סוג הפרויקט</span>
                <Building className="h-5 w-5 text-red-500 animate-bounce" style={{animationDuration: '2s'}} />
              </Label>
              <Select value={projectType} onValueChange={setProjectType} dir="rtl">
                <SelectTrigger className="w-full p-3 border-2 border-blue-300 text-lg focus:border-blue-500 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-50 to-purple-50" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="select-project-type">
                  <SelectValue placeholder="בחר סוג פרויקט" dir="rtl" style={{direction: 'rtl'}} />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`}>
                        <div className="flex items-center gap-2 justify-end" style={{direction: 'rtl'}}>
                          <span>{type.label}</span>
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
              <Label className="text-lg font-semibold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3 block flex items-center gap-2 justify-end" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-years">
                <span>כמות שנים</span>
                <Calendar className="h-5 w-5 text-red-500 animate-pulse" />
              </Label>
              <Select value={years} onValueChange={setYears} disabled={!projectType} dir="rtl">
                <SelectTrigger className="w-full p-3 border-2 border-green-300 text-lg focus:border-green-500 hover:border-green-400 disabled:bg-gray-50 disabled:border-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-50 to-teal-50" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="select-years">
                  <SelectValue placeholder="בחר כמות שנים" dir="rtl" style={{direction: 'rtl'}} />
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
              <Label className="text-lg font-semibold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-3 block flex items-center gap-2 justify-end" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-certificates">
                <span>כמות תעודות</span>
                <Award className="h-5 w-5 text-red-500 animate-spin" style={{animationDuration: '3s'}} />
              </Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={certificates}
                onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                className="w-full p-3 border-2 border-yellow-300 text-lg focus:border-yellow-500 hover:border-yellow-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-yellow-50 to-orange-50"
                dir="rtl"
                style={{direction: 'rtl', textAlign: 'right'}}
                data-testid="input-certificates"
              />
            </div>

            {/* Backup Certificates */}
            <div>
              <Label className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-3 block flex items-center gap-2 justify-end" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-backup-certificates">
                <span>תעודות גיבוי</span>
                <Shield className="h-5 w-5 text-red-500 animate-bounce" style={{animationDuration: '2.5s'}} />
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={backupCertificates}
                onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                className="w-full p-3 border-2 border-emerald-300 text-lg focus:border-emerald-500 hover:border-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-emerald-50 to-green-50"
                dir="rtl"
                style={{direction: 'rtl', textAlign: 'right'}}
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
              <p className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 font-bold" dir="rtl" style={{direction: 'rtl', textAlign: 'center'}} data-testid="label-final-price">מחיר סופי</p>
              <div className="bg-gradient-to-r from-white to-gray-50 rounded-lg p-4 shadow-xl border-2 border-transparent" style={{background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6) border-box'}}>
                <p className="text-4xl font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse" dir="rtl" style={{direction: 'rtl', textAlign: 'center'}} data-testid="text-total-price">
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
            <p className="font-medium" dir="rtl" style={{direction: 'rtl', textAlign: 'center'}} data-testid="text-company">Comsign 2025</p>
            <p className="text-xs text-black" dir="rtl" style={{direction: 'rtl', textAlign: 'center'}} data-testid="text-developer">NadavT</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
