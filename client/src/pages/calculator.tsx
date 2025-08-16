import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit, Settings, Scale, Building, Wrench, GraduationCap, User, Calendar, Award, Shield, Briefcase, Star, Heart, Home, Car, Plane, Camera, Music, Book, Coffee, Moon, Sun } from "lucide-react";
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
  const [newConfig, setNewConfig] = useState<AdminConfigUpdate>({ projectType: "", years: 1, basePrice: 0, backupCertificatePrice: 0, icon: "User" });
  const [passwordChange, setPasswordChange] = useState({ currentPassword: "", newPassword: "" });
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<PricingConfig | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const { toast } = useToast();

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const projectTypes = [
    { value: "lawyers", label: "עורכי דין", icon: Scale },
    { value: "architects", label: "אדריכלים", icon: Building },
    { value: "engineers", label: "מהנדסים", icon: Wrench },
    { value: "magna", label: "מגנא", icon: GraduationCap },
    { value: "regular", label: "רגיל", icon: User }
  ];

  const availableIcons = [
    { value: "User", label: "משתמש", component: User },
    { value: "Scale", label: "משפט", component: Scale },
    { value: "Building", label: "בניין", component: Building },
    { value: "Wrench", label: "כלי עבודה", component: Wrench },
    { value: "GraduationCap", label: "כובע סיום", component: GraduationCap },
    { value: "Briefcase", label: "תיק עבודה", component: Briefcase },
    { value: "Star", label: "כוכב", component: Star },
    { value: "Heart", label: "לב", component: Heart },
    { value: "Home", label: "בית", component: Home },
    { value: "Car", label: "רכב", component: Car },
    { value: "Plane", label: "מטוס", component: Plane },
    { value: "Camera", label: "מצלמה", component: Camera },
    { value: "Music", label: "מוזיקה", component: Music },
    { value: "Book", label: "ספר", component: Book },
    { value: "Coffee", label: "קפה", component: Coffee },
    { value: "Calendar", label: "לוח שנה", component: Calendar },
    { value: "Award", label: "פרס", component: Award },
    { value: "Shield", label: "מגן", component: Shield }
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
      setNewConfig({ projectType: "", years: 1, basePrice: 0, backupCertificatePrice: 0, icon: "User" });
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

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/reset-password", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "הצלחה", description: "סיסמה אופסה לברירת מחדל" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "שגיאה באיפוס סיסמה", variant: "destructive" });
    },
  });

  const AdminModal = () => {
    if (!isAdminLoggedIn) {
      return (
        <div className="p-6 text-center" dir="rtl">
          <h3 className="text-lg font-semibold mb-4 elegant-text" style={{direction: 'rtl'}}>התחברות אדמין</h3>
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
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-0 h-auto sm:h-10">
            <TabsTrigger value="manage" className="text-sm sm:text-base py-3 sm:py-2 px-4">ניהול מחירים</TabsTrigger>
            <TabsTrigger value="settings" className="text-sm sm:text-base py-3 sm:py-2 px-4">הגדרות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manage" className="mt-4">
            <div className="space-y-6">
              {/* Add New Configuration */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4 elegant-text" style={{direction: 'rtl'}}>הוספת תצורה חדשה</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div>
                      <Label className="elegant-text" style={{direction: 'rtl'}}>סוג פרויקט</Label>
                      <Input
                        value={newConfig.projectType}
                        onChange={(e) => setNewConfig({...newConfig, projectType: e.target.value})}
                        placeholder="למשל: עורכי דין"
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label className="elegant-text" style={{direction: 'rtl'}}>שנים</Label>
                      <Input
                        type="number"
                        value={newConfig.years}
                        onChange={(e) => setNewConfig({...newConfig, years: parseInt(e.target.value) || 1})}
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label className="elegant-text" style={{direction: 'rtl'}}>מחיר תעודה רגילה</Label>
                      <Input
                        type="number"
                        value={newConfig.basePrice}
                        onChange={(e) => setNewConfig({...newConfig, basePrice: parseFloat(e.target.value) || 0})}
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label className="elegant-text" style={{direction: 'rtl'}}>בחר אייקון</Label>
                      <Select value={newConfig.icon || "User"} onValueChange={(value) => setNewConfig({...newConfig, icon: value})} dir="rtl">
                        <SelectTrigger className="w-full border-2 border-gray-300 text-gray-900" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}}>
                          <SelectValue placeholder="בחר אייקון" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableIcons.map((icon) => {
                            const IconComponent = icon.component;
                            return (
                              <SelectItem key={icon.value} value={icon.value}>
                                <div className="flex items-center gap-2 justify-end" style={{direction: 'rtl'}}>
                                  <span>{icon.label}</span>
                                  <IconComponent className={`h-4 w-4 ${icon.value === 'Wrench' ? 'text-black dark:text-white' : 'text-red-500'}`} />
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="elegant-text" style={{direction: 'rtl'}}>מחיר תעודת גיבוי</Label>
                      <Input
                        type="number"
                        value={newConfig.backupCertificatePrice}
                        onChange={(e) => setNewConfig({...newConfig, backupCertificatePrice: parseFloat(e.target.value) || 0})}
                        dir="rtl"
                        style={{direction: 'rtl', textAlign: 'right'}}
                      />
                    </div>
                    <div>
                      <Label className="elegant-text" style={{direction: 'rtl'}}>סה"כ מחירים</Label>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border text-center price-display text-green-600" style={{direction: 'rtl'}}>
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
                  <h4 className="font-semibold mb-4 elegant-text" style={{direction: 'rtl'}}>תצורות קיימות</h4>
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
                            <div>
                              <Select value={editingConfig.icon || "User"} onValueChange={(value) => setEditingConfig({...editingConfig, icon: value})} dir="rtl">
                                <SelectTrigger className="w-full border-2 border-gray-300 text-gray-900" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}}>
                                  <SelectValue placeholder="בחר אייקון" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableIcons.map((icon) => {
                                    const IconComponent = icon.component;
                                    return (
                                      <SelectItem key={icon.value} value={icon.value}>
                                        <div className="flex items-center gap-2 justify-end" style={{direction: 'rtl'}}>
                                          <span>{icon.label}</span>
                                          <IconComponent className={`h-4 w-4 ${icon.value === 'Wrench' ? 'text-black dark:text-white' : 'text-red-500'}`} />
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
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
                              <div className="flex items-center gap-2 justify-start">
                                <span className="font-bold text-lg elegant-text">{config.projectType}</span>
                                {(() => {
                                  const iconData = availableIcons.find(icon => icon.value === config.icon);
                                  if (iconData) {
                                    const IconComponent = iconData.component;
                                    return <IconComponent className={`h-5 w-5 ${config.icon === 'Wrench' ? 'text-black dark:text-white' : 'text-red-500'}`} />;
                                  }
                                  return <User className="h-5 w-5 text-red-500" />;
                                })()}
                              </div>
                              <div className="text-sm space-y-1">
                                <div><span className="font-semibold">תקופה:</span> <span className="text-gray-600">{config.years} שנים</span></div>
                                <div><span className="font-semibold">מחיר תעודה רגילה:</span> <span className="text-blue-600">₪{config.basePrice}</span></div>
                                <div><span className="font-semibold">מחיר תעודת גיבוי:</span> <span className="text-orange-600">₪{config.backupCertificatePrice}</span></div>
                              </div>
                              <div className="price-display text-green-600">
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    disabled={deleteConfigMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle style={{direction: 'rtl', textAlign: 'right'}}>האם אתה בטוח?</AlertDialogTitle>
                                    <AlertDialogDescription style={{direction: 'rtl', textAlign: 'right'}}>
                                      פעולה זו תמחק את התצורה עבור {config.projectType} ({config.years} שנים) לצמיתות.
                                      לא ניתן לבטל פעולה זו.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-row-reverse gap-2">
                                    <AlertDialogCancel>בטל</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => {
                                        deleteConfigMutation.mutate(config.id);
                                        queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      מחק
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
                  <h5 className="font-semibold mb-3" style={{direction: 'rtl'}}>איפוס סיסמה</h5>
                  <Button 
                    onClick={() => resetPasswordMutation.mutate()}
                    disabled={resetPasswordMutation.isPending}
                    variant="outline"
                    className="w-full mb-4"
                  >
                    {resetPasswordMutation.isPending ? "מאפס..." : "אפס סיסמה לברירת מחדל"}
                  </Button>
                  
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} flex items-center justify-center p-2 sm:p-4 lg:p-6 relative overflow-hidden transition-all duration-500`} dir="rtl" lang="he" style={{fontFamily: 'system-ui, -apple-system, sans-serif', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed'}}>
      <Card className={`w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl shadow-2xl relative ${isDarkMode ? 'bg-gray-800/95 border-gray-600' : 'bg-white/95 border-gray-200'} backdrop-blur-sm border-2 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300`} dir="rtl" style={{direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed'}}>
        <CardContent className="p-4 sm:p-6 md:p-8" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}}>
          {/* Header with Logo and Settings */}
          <div className="mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
              {/* Logo centered on mobile, right on desktop */}
              <div className="flex-shrink-0 order-1 sm:order-none">
                <img 
                  src={comsignLogo} 
                  alt="Comsign Logo" 
                  className="h-14 sm:h-16 md:h-20 lg:h-24 w-auto object-contain"
                  data-testid="logo-comsign"
                />
              </div>
              
              {/* Dark mode and Settings buttons centered on mobile, left on desktop */}
              <div className="order-2 sm:order-none flex gap-2">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`border-2 ${isDarkMode ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900' : 'border-purple-300 text-purple-600 hover:bg-purple-50'} hover:border-opacity-60 p-2 sm:p-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                  data-testid="button-theme-toggle"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 p-2 sm:p-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95" data-testid="button-settings">
                      <Settings className="h-4 w-4 text-red-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto p-3 sm:p-4 md:p-6" dir="rtl">
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
              <h1 className={`text-3xl sm:text-4xl elegant-text ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2 transition-colors duration-300`} dir="rtl" style={{direction: 'rtl', textAlign: 'center', fontWeight: '700', letterSpacing: '-0.025em'}} data-testid="title-main">
                מחירון פרויקטים
              </h1>
              <div className="w-20 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full shadow-lg"></div>
            </div>
          </div>

          {/* Calculator Form */}
          <div className="space-y-5 sm:space-y-6">
            {/* Project Type Selection */}
            <div>
              <Label className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-4 block text-right transition-colors duration-300`} dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-project-type">
                <div className="flex items-center gap-2 justify-start">
                  <span>סוג הפרויקט</span>
                  <Building className="h-5 w-5 text-red-500" />
                </div>
              </Label>
              <Select value={projectType} onValueChange={setProjectType} dir="rtl">
                <SelectTrigger className={`w-full p-3 sm:p-3 border-2 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500' : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'} text-base sm:text-lg focus:border-gray-500 transition-all duration-300 shadow-md hover:shadow-lg min-h-[48px] sm:min-h-[44px]`} dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="select-project-type">
                  <SelectValue placeholder="בחר סוג פרויקט" className="text-sm sm:text-base text-gray-900" dir="rtl" style={{direction: 'rtl', color: '#111827'}} />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value} data-testid={`option-project-${type.value}`}>
                        <div className="flex items-center gap-1 sm:gap-2 justify-end" style={{direction: 'rtl'}}>
                          <span className="text-sm sm:text-base">{type.label}</span>
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
              <Label className="text-base sm:text-lg font-semibold text-gray-700 mb-4 block text-right" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-years">
                <div className="flex items-center gap-2 justify-start">
                  <span>כמות שנים</span>
                  <Calendar className="h-5 w-5 text-red-500" />
                </div>
              </Label>
              <Select value={years} onValueChange={setYears} disabled={!projectType} dir="rtl">
                <SelectTrigger className="w-full p-2 sm:p-3 border-2 border-gray-300 text-base sm:text-lg focus:border-gray-500 hover:border-gray-400 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300 disabled:opacity-100 transition-all duration-300 shadow-md hover:shadow-lg bg-white text-gray-900" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="select-years">
                  <SelectValue placeholder="בחר כמות שנים" className="text-sm sm:text-base text-gray-900" dir="rtl" style={{direction: 'rtl', color: '#111827'}} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-sm sm:text-base" data-testid={`option-years-${year}`}>
                      {year} שנים
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Certificate Quantity */}
            <div>
              <Label className="text-base sm:text-lg font-semibold text-gray-700 mb-4 block text-right" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-certificates">
                <div className="flex items-center gap-2 justify-start">
                  <span>כמות תעודות</span>
                  <Award className="h-5 w-5 text-red-500" />
                </div>
              </Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={certificates}
                onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                className="w-full p-3 sm:p-3 border-2 border-gray-300 text-base sm:text-lg focus:border-gray-500 hover:border-gray-400 transition-all duration-300 shadow-md hover:shadow-lg bg-white text-gray-900 min-h-[48px] sm:min-h-[44px]"
                dir="rtl"
                style={{direction: 'rtl', textAlign: 'right'}}
                data-testid="input-certificates"
                inputMode="numeric"
              />
            </div>

            {/* Backup Certificates */}
            <div>
              <Label className="text-base sm:text-lg font-semibold text-gray-700 mb-4 block text-right" dir="rtl" style={{direction: 'rtl', textAlign: 'right'}} data-testid="label-backup-certificates">
                <div className="flex items-center gap-2 justify-start">
                  <span>תעודות גיבוי</span>
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={backupCertificates}
                onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                className="w-full p-3 sm:p-3 border-2 border-gray-300 text-base sm:text-lg focus:border-gray-500 hover:border-gray-400 transition-all duration-300 shadow-md hover:shadow-lg bg-white text-gray-900 min-h-[48px] sm:min-h-[44px]"
                dir="rtl"
                style={{direction: 'rtl', textAlign: 'right'}}
                data-testid="input-backup-certificates"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Price Display */}
          <div className={`mt-4 sm:mt-8 p-4 sm:p-6 ${isDarkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'} rounded-xl border-2 shadow-xl relative overflow-hidden hover:shadow-2xl transition-all duration-300`}>
            {/* Animated sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-6 left-6 w-1 h-1 bg-gray-300 rounded-full animate-pulse" style={{animationDuration: '1.5s'}}></div>
            </div>
            <div className="text-center relative z-10">
              <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2 sm:mb-3 elegant-text transition-colors duration-300`} dir="rtl" style={{direction: 'rtl', textAlign: 'center', fontWeight: '600'}} data-testid="label-final-price">מחיר סופי</p>
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-3 sm:p-4 shadow-xl border-2 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300 hover:scale-105 active:scale-95`}>
                <p className="text-3xl sm:text-4xl price-display text-red-600 animate-pulse" dir="rtl" style={{direction: 'rtl', textAlign: 'center', animationDuration: '2s', fontWeight: '800'}} data-testid="text-total-price">
                  ₪{calculationResult?.totalPrice?.toLocaleString() || 0}
                </p>
              </div>
              {calculationResult?.discountInfo && (
                <p className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3 font-medium" data-testid="text-discount-info">
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
