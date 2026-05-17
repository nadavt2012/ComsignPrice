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
import type { CalculationResult, AdvancedLineItem } from "@shared/schema";

// Icons
import {
  Settings, Building, Calendar, Award, Shield,
  User, Scale, Wrench, GraduationCap, Briefcase,
  Star, Heart, Home, Car, Plane, Camera, Music,
  Book, Coffee, Calculator as CalcIcon, Stethoscope, Gavel,
  FileText, Globe, Palette, Code, Zap, TrendingUp,
  Search, ArrowUpDown, X, GripVertical,
  Landmark, Truck, Factory, Leaf, Hammer, CreditCard,
  Laptop, Phone, Scissors, Dumbbell, Utensils, ShoppingCart,
  Microscope, HardHat, Sailboat, TreePine, FlaskConical, Waves
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
    case 'Award': return Award;
    case 'Plane': return Plane;
    case 'Music': return Music;
    case 'Book': return Book;
    case 'Coffee': return Coffee;
    case 'Landmark': return Landmark;
    case 'Truck': return Truck;
    case 'Factory': return Factory;
    case 'Leaf': return Leaf;
    case 'Hammer': return Hammer;
    case 'CreditCard': return CreditCard;
    case 'Laptop': return Laptop;
    case 'Phone': return Phone;
    case 'Scissors': return Scissors;
    case 'Dumbbell': return Dumbbell;
    case 'Utensils': return Utensils;
    case 'ShoppingCart': return ShoppingCart;
    case 'Microscope': return Microscope;
    case 'HardHat': return HardHat;
    case 'Sailboat': return Sailboat;
    case 'TreePine': return TreePine;
    case 'FlaskConical': return FlaskConical;
    case 'Waves': return Waves;
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
  sku?: string | null;
  backupSku?: string | null;
  sortOrder?: number;
}

interface AdminConfigUpdate {
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
  icon?: string;
  tokenPrice?: number;
  tokenIncluded?: string;
  sku?: string;
  backupSku?: string;
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
  sku: z.string().max(100, "מקט ארוך מדי").optional(),
  backupSku: z.string().max(100, "מקט גיבוי ארוך מדי").optional(),
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
      sku: initialData?.sku || "",
      backupSku: initialData?.backupSku || "",
    },
  });

  const availableIcons = [
    { value: "User", label: "אדם" },
    { value: "Briefcase", label: "תיק עסקים" },
    { value: "Scale", label: "מאזניים" },
    { value: "Gavel", label: "פטיש שופט" },
    { value: "Building", label: "בניין" },
    { value: "Landmark", label: "מבנה ממשלה" },
    { value: "Home", label: "בית" },
    { value: "Stethoscope", label: "סטטוסקופ" },
    { value: "Heart", label: "לב" },
    { value: "Microscope", label: "מיקרוסקופ" },
    { value: "FlaskConical", label: "מבחנה" },
    { value: "Car", label: "רכב" },
    { value: "Truck", label: "משאית" },
    { value: "Plane", label: "מטוס" },
    { value: "Sailboat", label: "סירה" },
    { value: "CalcIcon", label: "מחשבון" },
    { value: "TrendingUp", label: "גרף עולה" },
    { value: "CreditCard", label: "כרטיס אשראי" },
    { value: "GraduationCap", label: "כובע בוגר" },
    { value: "Book", label: "ספר" },
    { value: "Wrench", label: "מפתח ברגים" },
    { value: "Hammer", label: "פטיש" },
    { value: "HardHat", label: "קסדת בנייה" },
    { value: "Factory", label: "מפעל" },
    { value: "Shield", label: "מגן" },
    { value: "Globe", label: "גלובוס" },
    { value: "Laptop", label: "מחשב נייד" },
    { value: "Code", label: "קוד" },
    { value: "Phone", label: "טלפון" },
    { value: "Camera", label: "מצלמה" },
    { value: "Palette", label: "פלטת צבעים" },
    { value: "Scissors", label: "מספריים" },
    { value: "Utensils", label: "כלי אוכל" },
    { value: "Coffee", label: "קפה" },
    { value: "ShoppingCart", label: "עגלת קניות" },
    { value: "Dumbbell", label: "משקולת" },
    { value: "Music", label: "תו מוזיקה" },
    { value: "Leaf", label: "עלה" },
    { value: "TreePine", label: "עץ" },
    { value: "Waves", label: "גלים" },
    { value: "FileText", label: "מסמך" },
    { value: "Award", label: "פרס" },
    { value: "Star", label: "כוכב" },
    { value: "Zap", label: "ברק" },
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מקט תעודה</FormLabel>
                <FormControl>
                  <Input placeholder="מספר מקט" {...field} value={field.value || ""} data-testid="input-sku" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="backupSku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מקט גיבוי</FormLabel>
                <FormControl>
                  <Input placeholder="מספר מקט גיבוי" {...field} value={field.value || ""} data-testid="input-backup-sku" />
                </FormControl>
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

// ===== PROJECT ORDER PANEL =====
type OrderedProjectType = { projectType: string; icon: string; sortOrder: number };

function SortableProjectItem({
  id, projectType, icon, index, isDragOverlay,
}: {
  id: string; projectType: string; icon: string; index: number; isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
    zIndex: isDragOverlay ? 999 : undefined,
  };
  const IconComp = getIconComponent(icon);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 border select-none transition-colors ${
        isDragging
          ? "opacity-40 bg-gray-50 border-gray-200"
          : isDragOverlay
          ? "bg-white border-blue-400 shadow-2xl ring-2 ring-blue-300"
          : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-blue-500 transition-colors touch-none"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Rank */}
      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
        {index + 1}
      </span>

      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
        <IconComp className="w-5 h-5 text-gray-600" />
      </div>

      {/* Name */}
      <span className="flex-1 font-semibold text-gray-800 text-base">{projectType}</span>
    </div>
  );
}

function ProjectOrderPanel({ configs, onSaved }: { configs: PricingConfig[]; onSaved: () => void }) {
  const { toast } = useToast();

  const initialOrder = useMemo(() => {
    const seen = new Map<string, OrderedProjectType>();
    configs.forEach(c => {
      if (!seen.has(c.projectType)) {
        seen.set(c.projectType, { projectType: c.projectType, icon: c.icon, sortOrder: c.sortOrder ?? 0 });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.projectType.localeCompare(b.projectType, 'he'));
  }, [configs]);

  const [orderedTypes, setOrderedTypes] = useState<OrderedProjectType[]>(initialOrder);
  const [isDirty, setIsDirty] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedTypes(initialOrder);
    setIsDirty(false);
  }, [configs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedTypes(prev => {
      const oldIndex = prev.findIndex(p => p.projectType === active.id);
      const newIndex = prev.findIndex(p => p.projectType === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const order = orderedTypes.map((pt, idx) => ({ projectType: pt.projectType, sortOrder: idx }));
      const res = await apiRequest("PUT", "/api/admin/project-order", { order });
      return res.json();
    },
    onSuccess: () => {
      setIsDirty(false);
      onSaved();
      toast({ title: "הסדר נשמר", description: "סדר הפרויקטים עודכן בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "לא ניתן לשמור את הסדר", variant: "destructive" });
    },
  });

  const activeItem = activeId ? orderedTypes.find(p => p.projectType === activeId) : null;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-gray-800">סדר הצגת פרויקטים</h2>
        <p className="text-sm text-gray-500">לחץ לחיצה ארוכה על פרויקט וגרור אותו למקום הרצוי</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedTypes.map(p => p.projectType)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedTypes.map((pt, index) => (
              <SortableProjectItem
                key={pt.projectType}
                id={pt.projectType}
                projectType={pt.projectType}
                icon={pt.icon}
                index={index}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
          {activeItem ? (
            <SortableProjectItem
              id={activeItem.projectType}
              projectType={activeItem.projectType}
              icon={activeItem.icon}
              index={orderedTypes.findIndex(p => p.projectType === activeItem.projectType)}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="flex justify-center pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold text-base disabled:opacity-40 min-w-[160px]"
        >
          {saveMutation.isPending ? "שומר..." : isDirty ? "שמור סדר" : "הסדר עדכני ✓"}
        </Button>
      </div>
    </div>
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
          <TabsList className={`max-w-7xl mx-auto h-auto bg-transparent gap-2 p-2 ${role === 'super_admin' ? 'grid grid-cols-4' : 'grid grid-cols-3'}`} dir="rtl">
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
            <TabsTrigger
              value="order"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 px-6 text-base font-medium rounded-lg transition-all"
              dir="rtl"
            >
              סדר פרויקטים
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
                        {config.sku && (
                          <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg">
                            <span className="font-semibold text-gray-700">מקט:</span>
                            <span className="font-bold text-blue-700">{config.sku}</span>
                          </div>
                        )}
                        {config.backupSku && (
                          <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-lg">
                            <span className="font-semibold text-gray-700">מקט גיבוי:</span>
                            <span className="font-bold text-amber-700">{config.backupSku}</span>
                          </div>
                        )}
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

        <TabsContent value="order" className="space-y-4">
          <ProjectOrderPanel configs={configs} onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/pricing"] })} />
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
  const [isAdvancedResult, setIsAdvancedResult] = useState(false); // דגל שמציין שהתוצאה היא מחישוב מתקדם
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [advancedItems, setAdvancedItems] = useState<AdvancedLineItem[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  // Year options with prices for grid selection
  const yearOptions = useMemo(() => {
    if (!projectType || !allConfigs) return [];
    return allConfigs
      .filter(config => config.projectType === projectType)
      .sort((a, b) => a.years - b.years);
  }, [projectType, allConfigs]);

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

  const [advancedResult, setAdvancedResult] = useState<CalculationResult | null>(null);

  const calculateAdvancedMutation = useMutation({
    mutationFn: async (data: { projectType: string; items: AdvancedLineItem[] }): Promise<CalculationResult> => {
      try {
        const res = await apiRequest("POST", "/api/calculate-advanced", data);
        return res.json();
      } catch (error) {
        console.error('Advanced calculation error:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      setAdvancedResult(result);
    },
    onError: (error: any) => {
      console.error('Advanced mutation error:', error);
      setAdvancedResult(null);
    },
  });

  // Auto-calculate advanced mode with debounce
  const debouncedAdvancedItems = useDebounce(advancedItems, 500);
  
  useEffect(() => {
    if (!projectType || !isAdvancedModalOpen) return;
    
    const hasValidData = debouncedAdvancedItems.some(item => 
      item.regularCertificates > 0 || item.backupCertificates > 0
    );
    
    if (hasValidData) {
      calculateAdvancedMutation.mutate({
        projectType,
        items: debouncedAdvancedItems,
      });
    } else {
      setAdvancedResult(null);
    }
  }, [debouncedAdvancedItems, projectType, isAdvancedModalOpen]);

  // Auto-calculate when inputs change - instant for better UX
  useEffect(() => {
    // אם התוצאה הנוכחית היא מחישוב מתקדם, לא נריץ חישוב רגיל
    if (isAdvancedResult) {
      return;
    }
    
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
        setIsAdvancedResult(false); // סימון שזו תוצאה רגילה
        calculateMutation.mutate(data);
      } else {
        setCalculationResult(null);
      }
    } catch (error) {
      console.error('Auto-calculation error:', error);
      setCalculationResult(null);
    }
  }, [projectType, years, certificates, backupCertificates, includeToken, dayOffset, isAdvancedResult]);

  // Reset all state when project type changes
  useEffect(() => {
    setYears("");
    setCalculationResult(null);
    setAdvancedResult(null);
    setIsAdvancedResult(false);
  }, [projectType]);

  // Reset backup certificates when they become unavailable
  useEffect(() => {
    if (!backupCertificatesAvailable && backupCertificates > 0) {
      setBackupCertificates(0);
    }
  }, [backupCertificatesAvailable]);

  // Calculate remaining days when dates change
  // Logic: Credit is for REMAINING days from TODAY until certificate expiry date
  useEffect(() => {
    try {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
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
        
        // Calculate REMAINING days from TODAY to end date (inclusive)
        // This represents the unused/remaining validity period
        const diffTime = end.getTime() - today.getTime();
        const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include end date
        
        // Set the remaining days (can be 0 if certificate already expired)
        setDayOffset(remainingDays > 0 ? remainingDays : 0);
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
          <Card className="premium-card w-full max-w-md sm:max-w-lg lg:max-w-3xl xl:max-w-5xl 2xl:max-w-6xl" dir="rtl">
            <CardContent className="p-2 sm:p-3 lg:p-6 xl:p-8 2xl:p-10 space-y-2 sm:space-y-3 lg:space-y-4 xl:space-y-5" dir="rtl">
            
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
                <h1 className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-red-700 bg-clip-text text-transparent" dir="rtl" data-testid="title-main">
                  מחירון פרויקטים
                </h1>
              </div>

              {/* Decorative Line */}
              <div className="h-px bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-70 mx-2"></div>
            </div>

            {/* Calculator Form */}
            <div className="space-y-3 lg:space-y-1 xl:space-y-2">
              {/* Project Type Selection */}
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block text-right" dir="rtl" data-testid="label-project-type">
                  סוג הפרויקט
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

              {/* Years Selection - Grid Cards */}
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block text-right" dir="rtl" data-testid="label-years">
                  בחר תקופה
                </Label>
                {yearsLoading ? (
                  <div className="text-center py-8 text-gray-600">טוען...</div>
                ) : yearsError ? (
                  <div className="text-center py-8 text-red-600">שגיאה בטעינה</div>
                ) : !projectType ? (
                  <div className="text-center py-8 text-gray-500">בחר סוג פרויקט תחילה</div>
                ) : yearOptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">אין אפשרויות זמינות</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 lg:gap-3" dir="rtl">
                    {yearOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setYears(option.years.toString())}
                        className={`
                          relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation
                          ${years === option.years.toString()
                            ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-600 shadow-xl shadow-red-200'
                            : 'bg-white border-gray-200 hover:border-red-300 hover:shadow-md hover:bg-red-50/30'
                          }
                        `}
                        data-testid={`option-years-${option.years}`}
                      >
                        <div className="text-center space-y-1">
                          <div className={`text-xl lg:text-2xl font-bold ${years === option.years.toString() ? 'text-white' : 'text-gray-800'}`}>
                            {option.years} {option.years === 1 ? 'שנה' : 'שנים'}
                          </div>
                          <div className={`text-base lg:text-lg font-bold ${years === option.years.toString() ? 'text-red-100' : 'text-emerald-600'}`}>
                            ₪{option.basePrice.toLocaleString()}
                          </div>
                          {option.sku && (
                            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${years === option.years.toString() ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`} dir="rtl">
                              <span>מקט:</span>
                              <span className="font-semibold">{option.sku}</span>
                            </div>
                          )}
                          {option.backupSku && option.backupCertificatePrice > 0 && (
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${years === option.years.toString() ? 'bg-white/15 text-red-100' : 'bg-amber-50 text-amber-600'}`} dir="rtl">
                              <span>גיבוי:</span>
                              <span className="font-semibold">{option.backupSku}</span>
                            </div>
                          )}
                        </div>
                        {years === option.years.toString() && (
                          <div className="absolute top-2 left-2 w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Certificate Quantity */}
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block text-right" dir="rtl" data-testid="label-certificates">
                  כמות תעודות
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
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block text-right" dir="rtl" data-testid="label-backup-certificates">
                    תעודות גיבוי
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
              <Dialog open={isAdvancedModalOpen} onOpenChange={(open) => {
                setIsAdvancedModalOpen(open);
                if (open && advancedItems.length === 0) {
                  const defaultYears = yearOptions.length > 0 ? yearOptions[0].years : 1;
                  setAdvancedItems([{ years: defaultYears, certificateType: "card", regularCertificates: 0, backupType: "card", backupCertificates: 0 }]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 px-6 lg:px-4 xl:px-5 py-3 lg:py-2 xl:py-2 rounded-lg font-semibold text-lg lg:text-base xl:text-lg min-h-[56px] lg:min-h-[40px] xl:min-h-[44px] touch-manipulation cursor-pointer" 
                    data-testid="button-advanced-calculation"
                  >
                    חישוב מתקדם
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center text-red-600 mb-1" dir="rtl">
                      חישוב מתקדם
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 text-center" dir="rtl">
                      מלא כמויות לכל תקופה — החישוב יתעדכן אוטומטית | טוקן: ₪120
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 p-2" dir="rtl">
                    
                    {/* Mobile View - Cards */}
                    <div className="md:hidden space-y-3">
                      {advancedItems.map((item, index) => {
                        const itemConfig = allConfigs.find(
                          config => config.projectType === projectType && config.years === item.years
                        );
                        const isBackupAvailable = itemConfig ? itemConfig.backupCertificatePrice > 0 : false;
                        
                        return (
                          <div key={index} className="border-2 border-red-100 rounded-xl p-4 bg-white shadow-sm space-y-4">
                            {/* Header with period and delete */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-red-100">
                              <div className="flex-1">
                                <Label className="text-xs font-semibold text-gray-600 mb-1 block">תקופה</Label>
                                <Select 
                                  value={item.years.toString()}
                                  onValueChange={(val) => {
                                    const newItems = [...advancedItems];
                                    newItems[index].years = parseInt(val);
                                    const newConfig = allConfigs.find(
                                      config => config.projectType === projectType && config.years === parseInt(val)
                                    );
                                    if (newConfig && newConfig.backupCertificatePrice === 0) {
                                      newItems[index].backupCertificates = 0;
                                    }
                                    setAdvancedItems(newItems);
                                  }}
                                >
                                  <SelectTrigger className="w-full min-h-[48px] border-red-200 focus:border-red-400 focus:ring-red-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {yearOptions.map((opt) => (
                                      <SelectItem key={opt.years} value={opt.years.toString()}>
                                        {opt.years} {opt.years === 1 ? 'שנה' : 'שנים'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newItems = advancedItems.filter((_, i) => i !== index);
                                  if (newItems.length === 0) {
                                    const defaultYears = yearOptions.length > 0 ? yearOptions[0].years : 1;
                                    setAdvancedItems([{ years: defaultYears, certificateType: "card", regularCertificates: 0, backupType: "card", backupCertificates: 0 }]);
                                  } else {
                                    setAdvancedItems(newItems);
                                  }
                                }}
                                disabled={advancedItems.length === 1}
                                className="h-12 w-12 p-0 hover:bg-red-100 hover:text-red-700 disabled:opacity-30"
                                title="מחק שורה"
                              >
                                <X className="h-6 w-6" />
                              </Button>
                            </div>
                            
                            {/* Certificates */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-600 mb-2 block">תעודות</Label>
                              <div className="flex gap-2 items-center">
                                <Select 
                                  value={item.certificateType}
                                  onValueChange={(val: "card" | "token") => {
                                    const newItems = [...advancedItems];
                                    newItems[index].certificateType = val;
                                    setAdvancedItems(newItems);
                                  }}
                                >
                                  <SelectTrigger className="w-28 min-h-[48px] border-red-200 focus:border-red-400 focus:ring-red-400 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="card">בכרטיס</SelectItem>
                                    <SelectItem value="token">בטוקן</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="flex-1 flex items-center gap-1 border-2 border-red-200 rounded-lg overflow-hidden">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newItems = [...advancedItems];
                                      if (newItems[index].regularCertificates > 0) {
                                        newItems[index].regularCertificates--;
                                        setAdvancedItems(newItems);
                                      }
                                    }}
                                    className="h-12 w-10 p-0 hover:bg-red-100 rounded-none border-0"
                                  >
                                    <span className="text-xl font-bold text-red-600">−</span>
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.regularCertificates}
                                    onChange={(e) => {
                                      const newItems = [...advancedItems];
                                      newItems[index].regularCertificates = Math.max(0, parseInt(e.target.value) || 0);
                                      setAdvancedItems(newItems);
                                    }}
                                    className="flex-1 min-h-[48px] text-center text-lg font-bold border-0 focus:ring-0 focus:outline-none"
                                    placeholder="0"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newItems = [...advancedItems];
                                      newItems[index].regularCertificates++;
                                      setAdvancedItems(newItems);
                                    }}
                                    className="h-12 w-10 p-0 hover:bg-red-100 rounded-none border-0"
                                  >
                                    <span className="text-xl font-bold text-red-600">+</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Backup */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-600 mb-2 block">גיבוי</Label>
                              <div className="flex gap-2 items-center">
                                <Select 
                                  value={item.backupType}
                                  onValueChange={(val: "card" | "token") => {
                                    const newItems = [...advancedItems];
                                    newItems[index].backupType = val;
                                    setAdvancedItems(newItems);
                                  }}
                                  disabled={!isBackupAvailable}
                                >
                                  <SelectTrigger className="w-28 min-h-[48px] border-red-200 focus:border-red-400 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="card">בכרטיס</SelectItem>
                                    <SelectItem value="token">בטוקן</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className={`flex-1 flex items-center gap-1 border-2 rounded-lg overflow-hidden ${isBackupAvailable ? 'border-red-200' : 'border-gray-300 bg-gray-50'}`}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (isBackupAvailable) {
                                        const newItems = [...advancedItems];
                                        if (newItems[index].backupCertificates > 0) {
                                          newItems[index].backupCertificates--;
                                          setAdvancedItems(newItems);
                                        }
                                      }
                                    }}
                                    disabled={!isBackupAvailable}
                                    className="h-12 w-10 p-0 hover:bg-red-100 rounded-none border-0 disabled:opacity-30"
                                  >
                                    <span className="text-xl font-bold text-red-600">−</span>
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.backupCertificates}
                                    onChange={(e) => {
                                      const newItems = [...advancedItems];
                                      newItems[index].backupCertificates = Math.max(0, parseInt(e.target.value) || 0);
                                      setAdvancedItems(newItems);
                                    }}
                                    disabled={!isBackupAvailable}
                                    className="flex-1 min-h-[48px] text-center text-lg font-bold border-0 focus:ring-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                                    placeholder={isBackupAvailable ? "0" : "לא זמין"}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (isBackupAvailable) {
                                        const newItems = [...advancedItems];
                                        newItems[index].backupCertificates++;
                                        setAdvancedItems(newItems);
                                      }
                                    }}
                                    disabled={!isBackupAvailable}
                                    className="h-12 w-10 p-0 hover:bg-red-100 rounded-none border-0 disabled:opacity-30"
                                  >
                                    <span className="text-xl font-bold text-red-600">+</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Desktop View - Table */}
                    <div className="hidden md:block border-2 border-red-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-base">
                        <thead className="bg-gradient-to-l from-red-50 to-red-100">
                          <tr>
                            <th className="p-3 text-right font-bold text-red-900 border-l border-red-200 w-36">תקופה</th>
                            <th className="p-3 text-right font-bold text-red-900 border-l border-red-200">תעודות</th>
                            <th className="p-3 text-right font-bold text-red-900 border-l border-red-200">גיבוי</th>
                            <th className="p-3 text-center font-bold text-red-900 w-16">מחק</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advancedItems.map((item, index) => {
                            const itemConfig = allConfigs.find(
                              config => config.projectType === projectType && config.years === item.years
                            );
                            const isBackupAvailable = itemConfig ? itemConfig.backupCertificatePrice > 0 : false;
                            
                            return (
                            <tr key={index} className="border-t border-red-100 hover:bg-red-50/30 transition-colors">
                              {/* תקופה */}
                              <td className="p-3 border-l border-red-100">
                                <Select 
                                  value={item.years.toString()}
                                  onValueChange={(val) => {
                                    const newItems = [...advancedItems];
                                    newItems[index].years = parseInt(val);
                                    
                                    const newConfig = allConfigs.find(
                                      config => config.projectType === projectType && config.years === parseInt(val)
                                    );
                                    if (newConfig && newConfig.backupCertificatePrice === 0) {
                                      newItems[index].backupCertificates = 0;
                                    }
                                    
                                    setAdvancedItems(newItems);
                                  }}
                                >
                                  <SelectTrigger className="w-full min-h-[44px] border-red-200 focus:border-red-400 focus:ring-red-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {yearOptions.map((opt) => (
                                      <SelectItem key={opt.years} value={opt.years.toString()}>
                                        {opt.years} {opt.years === 1 ? 'שנה' : 'שנים'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              
                              {/* תעודות */}
                              <td className="p-3 border-l border-red-100">
                                <div className="flex gap-2 items-center">
                                  <Select 
                                    value={item.certificateType}
                                    onValueChange={(val: "card" | "token") => {
                                      const newItems = [...advancedItems];
                                      newItems[index].certificateType = val;
                                      setAdvancedItems(newItems);
                                    }}
                                  >
                                    <SelectTrigger className="w-24 min-h-[44px] border-red-200 focus:border-red-400 focus:ring-red-400 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="card">בכרטיס</SelectItem>
                                      <SelectItem value="token">בטוקן</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="flex-1 flex items-center gap-1 border-2 border-red-200 rounded-lg overflow-hidden">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newItems = [...advancedItems];
                                        if (newItems[index].regularCertificates > 0) {
                                          newItems[index].regularCertificates--;
                                          setAdvancedItems(newItems);
                                        }
                                      }}
                                      className="h-11 w-9 p-0 hover:bg-red-100 rounded-none border-0"
                                    >
                                      <span className="text-lg font-bold text-red-600">−</span>
                                    </Button>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.regularCertificates}
                                      onChange={(e) => {
                                        const newItems = [...advancedItems];
                                        newItems[index].regularCertificates = Math.max(0, parseInt(e.target.value) || 0);
                                        setAdvancedItems(newItems);
                                      }}
                                      className="flex-1 min-h-[44px] text-center text-base font-bold border-0 focus:ring-0 focus:outline-none"
                                      placeholder="0"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newItems = [...advancedItems];
                                        newItems[index].regularCertificates++;
                                        setAdvancedItems(newItems);
                                      }}
                                      className="h-11 w-9 p-0 hover:bg-red-100 rounded-none border-0"
                                    >
                                      <span className="text-lg font-bold text-red-600">+</span>
                                    </Button>
                                  </div>
                                </div>
                              </td>
                              
                              {/* גיבוי */}
                              <td className="p-3 border-l border-red-100">
                                <div className="flex gap-2 items-center">
                                  <Select 
                                    value={item.backupType}
                                    onValueChange={(val: "card" | "token") => {
                                      const newItems = [...advancedItems];
                                      newItems[index].backupType = val;
                                      setAdvancedItems(newItems);
                                    }}
                                    disabled={!isBackupAvailable}
                                  >
                                    <SelectTrigger className="w-24 min-h-[44px] border-red-200 focus:border-red-400 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="card">בכרטיס</SelectItem>
                                      <SelectItem value="token">בטוקן</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className={`flex-1 flex items-center gap-1 border-2 rounded-lg overflow-hidden ${isBackupAvailable ? 'border-red-200' : 'border-gray-300 bg-gray-50'}`}>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (isBackupAvailable) {
                                          const newItems = [...advancedItems];
                                          if (newItems[index].backupCertificates > 0) {
                                            newItems[index].backupCertificates--;
                                            setAdvancedItems(newItems);
                                          }
                                        }
                                      }}
                                      disabled={!isBackupAvailable}
                                      className="h-11 w-9 p-0 hover:bg-red-100 rounded-none border-0 disabled:opacity-30"
                                    >
                                      <span className="text-lg font-bold text-red-600">−</span>
                                    </Button>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.backupCertificates}
                                      onChange={(e) => {
                                        const newItems = [...advancedItems];
                                        newItems[index].backupCertificates = Math.max(0, parseInt(e.target.value) || 0);
                                        setAdvancedItems(newItems);
                                      }}
                                      disabled={!isBackupAvailable}
                                      className="flex-1 min-h-[44px] text-center text-base font-bold border-0 focus:ring-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                                      placeholder={isBackupAvailable ? "0" : "לא זמין"}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (isBackupAvailable) {
                                          const newItems = [...advancedItems];
                                          newItems[index].backupCertificates++;
                                          setAdvancedItems(newItems);
                                        }
                                      }}
                                      disabled={!isBackupAvailable}
                                      className="h-11 w-9 p-0 hover:bg-red-100 rounded-none border-0 disabled:opacity-30"
                                    >
                                      <span className="text-lg font-bold text-red-600">+</span>
                                    </Button>
                                  </div>
                                </div>
                              </td>
                              
                              {/* מחק */}
                              <td className="p-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newItems = advancedItems.filter((_, i) => i !== index);
                                    if (newItems.length === 0) {
                                      const defaultYears = yearOptions.length > 0 ? yearOptions[0].years : 1;
                                      setAdvancedItems([{ years: defaultYears, certificateType: "card", regularCertificates: 0, backupType: "card", backupCertificates: 0 }]);
                                    } else {
                                      setAdvancedItems(newItems);
                                    }
                                  }}
                                  disabled={advancedItems.length === 1}
                                  className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-700 disabled:opacity-30"
                                  title="מחק שורה"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Row Button */}
                    <Button
                      onClick={() => {
                        const defaultYears = yearOptions.length > 0 ? yearOptions[0].years : 1;
                        setAdvancedItems([...advancedItems, { years: defaultYears, certificateType: "card", regularCertificates: 0, backupType: "card", backupCertificates: 0 }]);
                      }}
                      variant="outline"
                      className="w-full border-2 border-dashed border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 min-h-[48px] font-semibold rounded-lg transition-all"
                      data-testid="button-add-period"
                    >
                      <span className="text-lg mr-2">+</span> הוסף תקופה נוספת
                    </Button>
                    
                    {/* Live Price Display */}
                    {calculateAdvancedMutation.isPending && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <div className="text-gray-600 animate-pulse">מחשב...</div>
                      </div>
                    )}
                    
                    {advancedResult && !calculateAdvancedMutation.isPending && (
                      <div className="rounded-xl overflow-hidden border-2 border-red-200 shadow-lg" dir="rtl">
                        {/* Total Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-4 text-center">
                          <p className="text-xs text-red-200 font-semibold uppercase tracking-widest mb-1">סה״כ לתשלום</p>
                          <p className="text-4xl font-black text-white">₪{advancedResult.totalPrice.toLocaleString()}</p>
                        </div>

                        {/* Breakdown per row */}
                        <div className="divide-y divide-gray-100 bg-white">
                          {advancedItems.map((item, idx) => {
                            const cfg = allConfigs.find(c => c.projectType === projectType && c.years === item.years);
                            if (!cfg) return null;
                            const rowCost = (item.regularCertificates * cfg.basePrice) + (item.backupCertificates * cfg.backupCertificatePrice);
                            const totalCerts = item.regularCertificates + item.backupCertificates;
                            if (totalCerts === 0) return null;
                            const yearsLabel = item.years === 1 ? 'שנה' : 'שנים';
                            return (
                              <div key={idx} className="flex items-center justify-between px-5 py-4 gap-4">
                                {/* Price — left */}
                                <span className="font-black text-red-600 text-2xl flex-shrink-0">
                                  ₪{rowCost.toLocaleString()}
                                </span>
                                {/* Badges — right */}
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  <span className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                                    {item.years} {yearsLabel}
                                  </span>
                                  {item.regularCertificates > 0 && (
                                    <span className="bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
                                      {item.regularCertificates} {item.certificateType === 'token' ? 'טוקן' : 'כרטיס'}
                                    </span>
                                  )}
                                  {item.backupCertificates > 0 && (
                                    <span className="bg-blue-50 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full border border-blue-100">
                                      {item.backupCertificates} גיבוי {item.backupType === 'token' ? 'טוקן' : 'כרטיס'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-t border-gray-200">
                          <div className="flex gap-4">
                            {(advancedResult.totalSavings ?? 0) > 0 && (
                              <span className="text-green-600 font-semibold text-sm">חיסכון ₪{advancedResult.totalSavings!.toLocaleString()}</span>
                            )}
                            {(advancedResult.totalTokens ?? 0) > 0 && (
                              <span className="text-purple-600 font-semibold text-sm">
                                {advancedResult.totalTokens} טוקנים
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-gray-700 text-sm">
                            {advancedItems.reduce((s, i) => s + i.regularCertificates + i.backupCertificates, 0)} תעודות
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => {
                          if (!advancedResult) {
                            toast({
                              title: "אין תוצאות",
                              description: "אנא הזן לפחות תעודה אחת כדי לראות חישוב",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // ניקוי החישוב הרגיל - כי בחרנו חישוב מתקדם
                          setCertificates(1);
                          setBackupCertificates(0);
                          setIncludeToken(false);
                          
                          // סימון שזו תוצאה מחישוב מתקדם
                          setIsAdvancedResult(true);
                          
                          // Transfer result to main screen
                          setCalculationResult(advancedResult);
                          setIsAdvancedModalOpen(false);
                          toast({
                            title: "החישוב הועבר",
                            description: "התוצאה מוצגת במסך הראשי",
                          });
                        }}
                        disabled={!advancedResult || calculateAdvancedMutation.isPending}
                        className="flex-1 bg-gradient-to-l from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white min-h-[52px] font-bold rounded-lg text-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="button-apply-advanced"
                      >
                        אישור והמשך
                      </Button>
                      <Button
                        onClick={() => {
                          const defaultYears = yearOptions.length > 0 ? yearOptions[0].years : 1;
                          setAdvancedItems([{ years: defaultYears, certificateType: "card", regularCertificates: 0, backupType: "card", backupCertificates: 0 }]);
                          setAdvancedResult(null);
                          setIsAdvancedModalOpen(false);
                        }}
                        variant="outline"
                        className="flex-1 min-h-[52px] font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-base transition-all"
                        data-testid="button-reset-advanced"
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Price Display - Only show when there's a result */}
            {calculationResult && calculationResult.totalPrice !== null && calculationResult.totalPrice !== undefined && (
              <div className="mt-1 sm:mt-2 lg:mt-2 xl:mt-3 rounded-2xl overflow-hidden shadow-xl border border-red-100">
                {/* Price Header */}
                <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-4 py-3 text-center">
                  <p className="text-xs text-red-100 font-semibold uppercase tracking-widest mb-1" dir="rtl" data-testid="label-final-price">מחיר לתשלום</p>
                  <p className="text-3xl sm:text-4xl font-black text-white drop-shadow-sm" dir="rtl" data-testid="text-total-price">
                    ₪{calculationResult.totalPrice.toLocaleString()}
                  </p>
                  {(calculationResult?.basePrice ?? 0) > 0 && (calculationResult?.totalCertificates ?? 0) > 1 && (
                    <p className="text-xs text-red-200 mt-1 font-medium" dir="rtl" data-testid="text-unit-price">
                      ₪{calculationResult.basePrice.toLocaleString()} לתעודה
                    </p>
                  )}
                </div>

                {/* Details section */}
                <div className="bg-white px-3 py-2 space-y-2">
                  {/* Savings for simple calculator */}
                  {backupCertificatesAvailable && currentConfig && currentConfig.backupCertificatePrice < currentConfig.basePrice && backupCertificates > 0 && !calculationResult.totalSavings && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-center" dir="rtl">
                      <p className="text-xs text-green-700 font-semibold">פוטנציאל חיסכון</p>
                      <p className="text-lg font-bold text-green-600" data-testid="text-potential-savings">
                        ₪{((currentConfig.basePrice - currentConfig.backupCertificatePrice) * backupCertificates).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {backupCertificates} {backupCertificates === 1 ? 'תעודת גיבוי' : 'תעודות גיבוי'}
                      </p>
                    </div>
                  )}

                  {/* Savings from backend */}
                  {(calculationResult.totalSavings ?? 0) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-center" dir="rtl">
                      <p className="text-xs text-green-700 font-semibold">פוטנציאל חיסכון</p>
                      <p className="text-lg font-bold text-green-600" data-testid="text-potential-savings">
                        ₪{calculationResult.totalSavings!.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {calculationResult.discountedCertificates} {calculationResult.discountedCertificates === 1 ? 'תעודת גיבוי' : 'תעודות גיבוי'}
                      </p>
                    </div>
                  )}

                  {/* Tokens */}
                  {(calculationResult.totalTokens ?? 0) > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 text-center" dir="rtl">
                      <p className="text-xs text-purple-700 font-semibold">
                        {calculationResult.totalTokens} טוקנים
                      </p>
                    </div>
                  )}

                  {/* Backup / discount info */}
                  {calculationResult?.discountInfo && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 text-center">
                      <p className="text-xs text-purple-700 font-medium" data-testid="text-discount-info">
                        {calculationResult.discountInfo}
                      </p>
                    </div>
                  )}

                  {/* Day offset credit */}
                  {calculationResult?.dayOffsetInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-center">
                      <p className="text-xs text-blue-700 font-semibold" data-testid="text-day-offset-info">
                        {calculationResult.dayOffsetInfo}
                      </p>
                    </div>
                  )}

                  {/* Token disclaimer */}
                  {calculationResult?.tokenDisclaimer && (
                    <p className="text-xs text-gray-500 text-center pb-1 font-medium" data-testid="text-token-disclaimer">
                      {calculationResult.tokenDisclaimer}
                    </p>
                  )}

                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-gray-100 text-center space-y-0.5">
              <p className="font-bold text-gray-600 text-xs" dir="rtl" data-testid="text-company">Comsign © 2025</p>
              <p className="text-xs text-gray-400" data-testid="text-version">{versionInfo?.version || 'v3.0.1'}</p>
              <p className="text-xs text-gray-300">powered by NadavT</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}