import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Hooks & Utils
import { useToast } from "@/hooks/use-toast";
import { useVersion } from "@/hooks/useVersion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CalculationResult } from "@shared/schema";

// Icons
import { 
  Settings, Building, Calendar, Award, Shield, 
  User, Scale, Wrench, GraduationCap, Briefcase, 
  Star, Heart, Home, Car, Plane, Camera, Music, 
  Book, Coffee, Calculator as CalcIcon, Stethoscope, Gavel, 
  FileText, Globe, Palette, Code, Zap, TrendingUp,
  Search, ArrowUpDown, X
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

interface AdminConfigUpdate {
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
  icon?: string;
  tokenPrice?: number;
  tokenIncluded?: string;
}

// Form validation schema
const adminConfigSchema = z.object({
  projectType: z.string().min(1, "סוג פרויקט נדרש").max(50, "סוג פרויקט ארוך מדי"),
  years: z.number().int("מספר שנים חייב להיות מספר שלם").min(1, "מספר שנים חייב להיות לפחות 1").max(10, "מספר שנים מקסימלי הוא 10"),
  basePrice: z.number().min(0, "מחיר בסיס לא יכול להיות שלילי").max(1000000, "מחיר בסיס מקסימלי הוא מיליון שקלים"),
  backupCertificatePrice: z.number().min(0, "מחיר תעודת גיבוי לא יכול להיות שלילי").max(1000000, "מחיר תעודת גיבוי מקסימלי הוא מיליון שקלים"),
  icon: z.string().optional(),
  tokenPrice: z.number().min(0, "מחיר טוקן לא יכול להיות שלילי").max(10000, "מחיר טוקן מקסימלי הוא 10,000 שקלים").optional(),
  tokenIncluded: z.enum(["true", "false", "optional"], { errorMap: () => ({ message: "סטטוס טוקן חייב להיות 'true', 'false' או 'optional'" }) }).optional(),
});

// ===== ADMIN COMPONENTS =====
function AdminConfigForm({
  initialData,
  onSubmit,
  isLoading,
  onCancel,
  title
}: {
  initialData?: PricingConfig | null;
  onSubmit: (data: AdminConfigUpdate) => void;
  isLoading: boolean;
  onCancel: () => void;
  title: string;
}) {
  const form = useForm<AdminConfigUpdate>({
    resolver: zodResolver(adminConfigSchema),
    defaultValues: {
      projectType: initialData?.projectType || "",
      years: initialData?.years || 1,
      basePrice: initialData?.basePrice || 0,
      backupCertificatePrice: initialData?.backupCertificatePrice || 0,
      icon: initialData?.icon || "User",
      tokenPrice: initialData?.tokenPrice || 120,
      tokenIncluded: initialData?.tokenIncluded || "optional",
    },
  });

  const availableIcons = [
    { value: "User", label: "משתמש" },
    { value: "Scale", label: "מאזניים (עורכי דין)" },
    { value: "Building", label: "בניין (אדריכלים)" },
    { value: "Stethoscope", label: "סטטוסקופ (בריאות)" },
    { value: "Car", label: "רכב (מכס/שמאים)" },
    { value: "CalcIcon", label: "מחשבון (שע״מ)" },
    { value: "FileText", label: "מסמך" },
    { value: "TrendingUp", label: "גרף (מגנא)" },
    { value: "Zap", label: "ברק" },
    { value: "Star", label: "כוכב" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <h3 className="text-lg font-bold text-center">{title}</h3>
        
        <FormField
          control={form.control}
          name="projectType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>סוג פרויקט</FormLabel>
              <FormControl>
                <Input placeholder="הזן סוג פרויקט" {...field} data-testid="input-project-type" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מספר שנים</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="שנים" 
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-years"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>אייקון</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-icon">
                      <SelectValue placeholder="בחר אייקון" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableIcons.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מחיר בסיס (₪)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="מחיר בסיס" 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    data-testid="input-base-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="backupCertificatePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מחיר תעודת גיבוי (₪)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="מחיר תעודת גיבוי" 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    data-testid="input-backup-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tokenPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מחיר טוקן (₪)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="מחיר טוקן" 
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    data-testid="input-token-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tokenIncluded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>סטטוס טוקן</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-token-included">
                      <SelectValue placeholder="בחר סטטוס טוקן" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">כלול במחיר</SelectItem>
                    <SelectItem value="false">לא כלול</SelectItem>
                    <SelectItem value="optional">אופציונלי</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "שומר..." : "שמור"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AdminLogin({ onLoginSuccess, onCancel }: { onLoginSuccess: (role: string) => void; onCancel?: () => void }) {
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
      
      <div className="flex gap-3">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 min-h-[56px] text-lg touch-manipulation cursor-pointer border-gray-300 hover:bg-gray-100"
            data-testid="button-cancel-login"
          >
            חזור
          </Button>
        )}
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[56px] text-lg touch-manipulation cursor-pointer"
          data-testid="button-admin-login"
        >
          {isLoading ? "מתחבר..." : "התחבר"}
        </Button>
      </div>
    </div>
  );
}

// ===== USERS MANAGEMENT COMPONENT =====
function UsersManagement() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch users
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; displayName: string; role: string; password: string }) => {
      return apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowAddUser(false);
      toast({ title: 'המשתמש נוצר בהצלחה!' });
    },
    onError: () => {
      toast({ title: 'שגיאה ביצירת משתמש', variant: 'destructive' });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PATCH', `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      toast({ title: 'המשתמש עודכן בהצלחה!' });
    },
    onError: () => {
      toast({ title: 'שגיאה בעדכון משתמש', variant: 'destructive' });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteConfirm(null);
      toast({ title: 'המשתמש נמחק בהצלחה!' });
    },
    onError: () => {
      toast({ title: 'שגיאה במחיקת משתמש', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">משתמשי המערכת</h3>
        <Button
          onClick={() => setShowAddUser(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          + הוסף משתמש
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user: any) => (
          <div
            key={user.id}
            className="border-2 border-gray-200 p-5 rounded-xl bg-white shadow-sm hover:shadow-lg hover:border-blue-400 transition-all duration-200"
          >
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`${user.role === 'super_admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full text-xs font-semibold`}>
                    {user.role === 'super_admin' ? 'סופר אדמין' : 'מנהל'}
                  </div>
                  <h5 className="font-bold text-xl text-gray-900">{user.displayName}</h5>
                </div>
                <p className="text-sm text-gray-600">{user.username}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => setEditingUser(user)}
                  className="flex-1 lg:flex-none lg:min-w-[100px]"
                >
                  ערוך
                </Button>
                {user.role !== 'super_admin' && (
                  <Button
                    size="default"
                    variant="destructive"
                    onClick={() => setDeleteConfirm(user.id)}
                    className="flex-1 lg:flex-none lg:min-w-[100px]"
                  >
                    מחק
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add User Dialog */}
      {showAddUser && (
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>הוסף משתמש חדש</DialogTitle>
            </DialogHeader>
            <UserForm
              onSubmit={(data: any) => createUserMutation.mutate(data)}
              onCancel={() => setShowAddUser(false)}
              isLoading={createUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>ערוך משתמש</DialogTitle>
            </DialogHeader>
            <UserForm
              initialData={editingUser}
              onSubmit={(data: any) => updateUserMutation.mutate({ id: editingUser.id, data })}
              onCancel={() => setEditingUser(null)}
              isLoading={updateUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
              <DialogDescription>
                האם אתה בטוח שאתה רוצה למחוק משתמש זה? פעולה זו לא ניתנת לביטול.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                ביטול
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteUserMutation.mutate(deleteConfirm)}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? 'מוחק...' : 'מחק'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ===== USER FORM COMPONENT =====
function UserForm({ initialData, onSubmit, onCancel, isLoading }: any) {
  const [username, setUsername] = useState(initialData?.username || '');
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [role, setRole] = useState(initialData?.role || 'manager');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { username, displayName, role };
    if (password) data.password = password;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>שם משתמש</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={!!initialData}
        />
      </div>
      <div>
        <Label>שם תצוגה</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>תפקיד</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">מנהל</SelectItem>
            <SelectItem value="super_admin">סופר אדמין</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{initialData ? 'סיסמה חדשה (אופציונלי)' : 'סיסמה'}</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!initialData}
        />
      </div>
      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'שומר...' : initialData ? 'עדכן' : 'צור משתמש'}
        </Button>
      </div>
    </form>
  );
}

function AdminPanel({ role, onLogout }: { role: string; onLogout: () => void }) {
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"projectType" | "years" | "basePrice">("projectType");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use React Query for admin configs to sync with main screen
  const { data: configs = [], isLoading, refetch } = useQuery<PricingConfig[]>({
    queryKey: ["/api/pricing"],
    staleTime: 30 * 1000, // 30 seconds cache for better performance
    refetchOnWindowFocus: false,
  });

  // Filter and sort configs
  const filteredAndSortedConfigs = useMemo(() => {
    let filtered = configs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(config =>
        config.projectType.toLowerCase().includes(query) ||
        config.years.toString().includes(query) ||
        config.basePrice.toString().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "projectType") {
        comparison = a.projectType.localeCompare(b.projectType, 'he');
      } else if (sortBy === "years") {
        comparison = a.years - b.years;
      } else if (sortBy === "basePrice") {
        comparison = a.basePrice - b.basePrice;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [configs, searchQuery, sortBy, sortOrder]);

  // Admin mutations
  const createMutation = useMutation({
    mutationFn: async (data: AdminConfigUpdate): Promise<PricingConfig> => {
      const res = await apiRequest("POST", "/api/admin/pricing", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      setShowAddForm(false);
      toast({
        title: "הצלחה",
        description: "הקונפיגורציה נוספה בהצלחה",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהוספת הקונפיגורציה",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminConfigUpdate }): Promise<PricingConfig> => {
      const res = await apiRequest("PUT", `/api/admin/pricing/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      setEditingConfig(null);
      toast({
        title: "הצלחה",
        description: "הקונפיגורציה עודכנה בהצלחה",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בעדכון הקונפיגורציה",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiRequest("DELETE", `/api/admin/pricing/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      setDeleteConfirm(null);
      toast({
        title: "הצלחה",
        description: "הקונפיגורציה נמחקה בהצלחה",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה במחיקת הקונפיגורציה",
        variant: "destructive",
      });
    },
  });

  return (
    <>
    <div className="h-full flex flex-col bg-white" dir="rtl">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 shadow-lg" dir="rtl">
        <div className="flex justify-between items-center max-w-7xl mx-auto" dir="rtl">
          <div className="text-right" dir="rtl">
            <h1 className="text-2xl font-bold" dir="rtl">פאנל ניהול המערכת</h1>
            <p className="text-sm text-blue-100 mt-1" dir="rtl">{role === 'super_admin' ? 'סופר אדמין' : 'מנהל'}</p>
          </div>
          <Button 
            onClick={onLogout} 
            variant="outline" 
            className="bg-white text-blue-600 hover:bg-blue-50 border-none shadow-md"
            dir="rtl"
          >
            התנתק
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="view" className="flex-1 flex flex-col" dir="rtl">
        <div className="bg-white border-b shadow-sm" dir="rtl">
          <TabsList className={`max-w-7xl mx-auto h-auto bg-transparent gap-2 p-2 ${role === 'super_admin' ? 'grid grid-cols-3' : 'grid grid-cols-2'}`} dir="rtl">
            <TabsTrigger 
              value="view" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 px-6 text-base font-medium rounded-lg transition-all"
              dir="rtl"
            >
              ניהול מחירים
            </TabsTrigger>
            <TabsTrigger 
              value="add" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 px-6 text-base font-medium rounded-lg transition-all"
              dir="rtl"
            >
              הוסף מחיר חדש
            </TabsTrigger>
            {role === 'super_admin' && (
              <TabsTrigger 
                value="users" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 px-6 text-base font-medium rounded-lg transition-all"
                dir="rtl"
              >
                ניהול משתמשים
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
        
        <TabsContent value="view" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">טוען נתונים...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600 text-lg">אין קונפיגורציות עדיין</p>
              <p className="text-gray-500 text-sm mt-2">לחץ על "הוסף מחיר חדש" להתחיל</p>
            </div>
          ) : (
            <>
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type="text"
                      placeholder="חיפוש לפי סוג פרויקט, שנים או מחיר..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 h-11"
                      data-testid="input-search-configs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                      <SelectTrigger className="w-[180px] h-11" data-testid="select-sort-by">
                        <SelectValue placeholder="מיין לפי" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="projectType">סוג פרויקט</SelectItem>
                        <SelectItem value="years">מספר שנים</SelectItem>
                        <SelectItem value="basePrice">מחיר בסיס</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="h-11 px-3"
                      data-testid="button-toggle-sort-order"
                    >
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                      {sortOrder === "asc" ? "עולה" : "יורד"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>מציג {filteredAndSortedConfigs.length} מתוך {configs.length} קונפיגורציות</span>
                  {searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="text-blue-600 h-auto p-0"
                    >
                      נקה חיפוש
                    </Button>
                  )}
                </div>
              </div>

              {filteredAndSortedConfigs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 text-lg">לא נמצאו תוצאות</p>
                  <p className="text-gray-500 text-sm mt-2">נסה לשנות את מונח החיפוש</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredAndSortedConfigs.map((config) => (
                    <div key={config.id} className="border-2 border-gray-200 p-5 rounded-xl bg-white shadow-sm hover:shadow-lg hover:border-blue-400 transition-all duration-200">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                          {config.years} {config.years === 1 ? 'שנה' : 'שנים'}
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">{config.projectType}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="font-semibold text-gray-700">מחיר בסיס:</span>
                          <span className="text-green-700 font-bold">₪{config.basePrice}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="font-semibold text-gray-700">תעודת גיבוי:</span>
                          <span className="text-purple-700 font-bold">₪{config.backupCertificatePrice}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="font-semibold text-gray-700">מחיר טוקן:</span>
                          <span className="text-orange-700 font-bold">₪{config.tokenPrice}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="font-semibold text-gray-700">טוקן:</span>
                          <span className="font-medium">{config.tokenIncluded === "true" ? "כלול" : config.tokenIncluded === "optional" ? "אופציונלי" : "לא כלול"}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="font-semibold text-gray-700">אייקון:</span>
                          <span className="font-medium">{config.icon}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex lg:flex-col gap-2 justify-end">
                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => setEditingConfig(config)}
                        data-testid={`button-edit-${config.id}`}
                        className="flex-1 lg:flex-none lg:min-w-[100px]"
                      >
                        ערוך
                      </Button>
                      <Button
                        size="default"
                        variant="destructive"
                        onClick={() => setDeleteConfirm(config.id)}
                        data-testid={`button-delete-${config.id}`}
                        className="flex-1 lg:flex-none lg:min-w-[100px]"
                      >
                        מחק
                      </Button>
                    </div>
                  </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="add" className="space-y-4">
          <AdminConfigForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setShowAddForm(false)}
            title="הוסף קונפיגורציה חדשה"
          />
        </TabsContent>

        {role === 'super_admin' && (
          <TabsContent value="users" className="space-y-4">
            <UsersManagement />
          </TabsContent>
        )}
        </div>
      </div>
    </Tabs>
  </div>

    {/* Edit Dialog */}
      {editingConfig && (
        <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>ערוך קונפיגורציה</DialogTitle>
            </DialogHeader>
            <AdminConfigForm
              initialData={editingConfig}
              onSubmit={(data) => updateMutation.mutate({ id: editingConfig.id, data })}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingConfig(null)}
              title={`עריכת ${editingConfig.projectType}`}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
              <DialogDescription>
                האם אתה בטוח שאתה רוצה למחוק את הקונפיגורציה הזו? פעולה זו לא ניתנת לביטול.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                ביטול
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "מוחק..." : "מחק"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
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
  const { versionInfo } = useVersion();

  // ===== DYNAMIC PROJECT TYPES FROM DATABASE =====
  const { data: allConfigs = [], isLoading: configsLoading, error: configsError } = useQuery<PricingConfig[]>({
    queryKey: ["/api/pricing"],
    staleTime: 1000 * 60 * 5, // 5 minutes cache for much better performance
    gcTime: 1000 * 60 * 10, // 10 minutes cleanup
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  // Show error toast if configs fail to load
  useEffect(() => {
    if (configsError) {
      console.error('Failed to load pricing configs:', configsError);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את סוגי הפרויקטים. נסה לרענן את הדף.",
        variant: "destructive",
      });
    }
  }, [configsError, toast]);

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

  // Get current pricing config to check backup certificate availability
  const currentConfig = useMemo(() => {
    if (!projectType || !years) return null;
    return allConfigs.find(
      config => config.projectType === projectType && config.years === parseInt(years)
    );
  }, [allConfigs, projectType, years]);

  // Check if backup certificates are available
  const backupCertificatesAvailable = useMemo(() => {
    if (!currentConfig) return false;
    return currentConfig.backupCertificatePrice > 0;
  }, [currentConfig]);

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

  // Reset backup certificates when they become unavailable
  useEffect(() => {
    if (!backupCertificatesAvailable && backupCertificates > 0) {
      setBackupCertificates(0);
    }
  }, [backupCertificatesAvailable]);

  // Calculate remaining days when dates change
  useEffect(() => {
    try {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          setDayOffset(0);
          return;
        }
        
        // Validate that end date is after start date
        if (end < start) {
          setDayOffset(0);
          return;
        }
        
        // Calculate days between start and end dates (inclusive of both dates)
        const diffTime = end.getTime() - start.getTime();
        const daysBetween = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        
        // Set the days (always positive since we validated end >= start)
        setDayOffset(daysBetween > 0 ? daysBetween : 0);
      } else {
        setDayOffset(0);
      }
    } catch (error) {
      console.error('Date calculation error:', error);
      setDayOffset(0);
    }
  }, [startDate, endDate]);

  // Admin Panel Full Screen Mode
  if (isAdminModalOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        {!isAdminLoggedIn ? (
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md shadow-xl">
              <CardContent className="p-6">
                <AdminLogin 
                  onLoginSuccess={(role: string) => {
                    setIsAdminLoggedIn(true);
                    setAdminRole(role);
                  }}
                  onCancel={() => setIsAdminModalOpen(false)}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="h-screen flex flex-col">
            <AdminPanel 
              role={adminRole}
              onLogout={() => {
                setIsAdminLoggedIn(false);
                setAdminRole("");
                setAdminPassword("");
                setIsAdminModalOpen(false);
              }} 
            />
          </div>
        )}
      </div>
    );
  }

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
                  <Button 
                    variant="outline" 
                    className="border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-14 w-14 lg:h-12 lg:w-12 xl:h-14 xl:w-14 rounded-lg shadow-sm touch-manipulation cursor-pointer flex items-center justify-center" 
                    data-testid="button-admin-access"
                    onClick={() => setIsAdminModalOpen(true)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Settings className="h-6 w-6 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-red-600" />
                  </Button>
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
                <div className="flex items-center gap-2" dir="ltr">
                  <Button
                    type="button"
                    onClick={() => setCertificates(Math.max(1, certificates - 1))}
                    className="flex-shrink-0 w-14 h-14 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-2xl lg:text-xl xl:text-2xl rounded-lg shadow-sm active:scale-95 transition-all duration-150 touch-manipulation"
                    data-testid="button-decrease-certificates"
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={certificates}
                    onChange={(e) => setCertificates(parseInt(e.target.value) || 1)}
                    className="flex-1 p-4 lg:p-2 xl:p-3 border border-gray-300 text-lg lg:text-base xl:text-lg focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] lg:min-h-[40px] xl:min-h-[44px] text-center touch-manipulation"
                    placeholder="כמות תעודות"
                    data-testid="input-certificates"
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    onClick={() => setCertificates(Math.min(1000, certificates + 1))}
                    className="flex-shrink-0 w-14 h-14 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-2xl lg:text-xl xl:text-2xl rounded-lg shadow-sm active:scale-95 transition-all duration-150 touch-manipulation"
                    data-testid="button-increase-certificates"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Backup Certificates - Only show if available */}
              {backupCertificatesAvailable && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block text-right" dir="rtl" data-testid="label-backup-certificates">
                    <span>תעודות גיבוי</span>
                  </Label>
                  <div className="flex items-center gap-2" dir="ltr">
                    <Button
                      type="button"
                      onClick={() => setBackupCertificates(Math.max(0, backupCertificates - 1))}
                      className="flex-shrink-0 w-14 h-14 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-2xl lg:text-xl xl:text-2xl rounded-lg shadow-sm active:scale-95 transition-all duration-150 touch-manipulation"
                      data-testid="button-decrease-backup-certificates"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={backupCertificates}
                      onChange={(e) => setBackupCertificates(parseInt(e.target.value) || 0)}
                      className="flex-1 p-4 lg:p-2 xl:p-3 border border-gray-300 text-lg lg:text-base xl:text-lg focus:border-gray-500 hover:border-gray-400 bg-white text-gray-900 min-h-[56px] lg:min-h-[40px] xl:min-h-[44px] text-center touch-manipulation"
                      placeholder="תעודות גיבוי"
                      data-testid="input-backup-certificates"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      onClick={() => setBackupCertificates(Math.min(100, backupCertificates + 1))}
                      className="flex-shrink-0 w-14 h-14 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-2xl lg:text-xl xl:text-2xl rounded-lg shadow-sm active:scale-95 transition-all duration-150 touch-manipulation"
                      data-testid="button-increase-backup-certificates"
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

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
                      הזן תאריך התחלה ותאריך סיום לחישוב מחיר לפי מספר הימים בתקופה
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-2 p-2" dir="rtl">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="start-date" className="text-sm font-semibold text-gray-700 mb-2 block text-right">
                          תאריך התחלה
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg text-center min-h-[48px]"
                          data-testid="input-start-date"
                          placeholder="לדוגמה: 01/01/2024"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="end-date" className="text-sm font-semibold text-gray-700 mb-2 block text-right">
                          תאריך סיום
                        </Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg text-center min-h-[48px]"
                          data-testid="input-end-date"
                          placeholder="לדוגמה: 31/12/2024"
                        />
                      </div>
                      
                      {startDate && endDate && (
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <p className="text-center text-blue-800 font-medium">
                            {dayOffset > 0 ? (
                              <>מספר ימים בתקופה: {dayOffset} ימים</>
                            ) : (
                              <>תאריך הסיום חייב להיות אחרי תאריך ההתחלה</>
                            )}
                          </p>
                          {dayOffset > 0 && (
                            <p className="text-center text-blue-600 text-sm mt-1">
                              המחיר יחושב לפי {dayOffset} ימים
                            </p>
                          )}
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

            {/* Price Display - Only show when there's a result */}
            {calculationResult && calculationResult.totalPrice !== null && calculationResult.totalPrice !== undefined && (
              <div className="mt-1 sm:mt-2 lg:mt-2 xl:mt-3 p-2 sm:p-3 lg:p-3 xl:p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 rounded-xl border shadow-lg">
                <div className="text-center space-y-2">
                  
                  {/* Main Price Display */}
                  <div>
                    <p className="text-xs sm:text-sm lg:text-sm xl:text-base text-gray-700 mb-1 lg:mb-2 xl:mb-2 font-semibold" dir="rtl" data-testid="label-final-price">מחיר לתשלום</p>
                    <div className="bg-white border-gray-200 rounded-lg p-2 sm:p-3 lg:p-3 xl:p-4 shadow-lg border">
                      <p className="text-xl sm:text-2xl lg:text-2xl xl:text-2xl font-bold text-red-600" dir="rtl" data-testid="text-total-price">
                        ₪{calculationResult.totalPrice.toLocaleString()}
                      </p>
                      {/* Price per single certificate - only show when more than 1 certificate */}
                      {calculationResult?.basePrice && calculationResult?.totalCertificates > 1 && (
                        <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1" dir="rtl" data-testid="text-unit-price">
                          מחיר תעודה אחת: ₪{calculationResult.basePrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Backup Certificates - Separate Line */}
                  {calculationResult?.discountInfo && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 lg:p-3">
                      <p className="text-xs sm:text-sm lg:text-base text-purple-700 font-medium" data-testid="text-discount-info">
                        {calculationResult.discountInfo}
                      </p>
                    </div>
                  )}

                  {/* Day Offset Credit - Clear Display */}
                  {calculationResult?.dayOffsetInfo && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 lg:p-3">
                      <p className="text-xs sm:text-sm lg:text-base text-green-700 font-semibold" data-testid="text-day-offset-info">
                        {calculationResult.dayOffsetInfo}
                      </p>
                    </div>
                  )}

                  {/* Token Disclaimer */}
                  {calculationResult?.tokenDisclaimer && (
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-2 font-medium" data-testid="text-token-disclaimer">
                      {calculationResult.tokenDisclaimer}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-1 sm:mt-2 lg:mt-2 xl:mt-3 text-center">
              <p className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base xl:text-lg" dir="rtl" data-testid="text-company">Comsign 2025</p>
              <p className="text-xs sm:text-xs lg:text-sm xl:text-base text-gray-600" data-testid="text-developer">© Powered By NadavT</p>
              <p className="text-xs text-gray-400 mt-1" data-testid="text-version">{versionInfo?.version || 'v3.0.1'}</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}