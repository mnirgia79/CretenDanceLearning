import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCourseSchema, Course, SchoolYear } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/i18n";

// Extend the schema to include validation
const formSchema = insertCourseSchema.extend({
  schoolYearId: z.string().or(z.number()).transform(val => Number(val)),
  monthlyFee: z.string().or(z.number()).transform(val => Number(val)),
});

type CourseFormValues = z.infer<typeof formSchema>;

interface CourseFormProps {
  course?: Course;
  schoolYears: SchoolYear[];
  onSubmit: (data: CourseFormValues) => void;
  isSubmitting: boolean;
}

export function CourseForm({ course, schoolYears, onSubmit, isSubmitting }: CourseFormProps) {
  // Find the active school year for new courses
  const activeSchoolYear = schoolYears.find(year => year.active);
  
  // Initialize the form with existing data or defaults
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: course?.name || "",
      description: course?.description || "",
      type: course?.type || "dance",
      schoolYearId: course?.schoolYearId || activeSchoolYear?.id || "",
      monthlyFee: course?.monthlyFee || 30,
      active: course?.active ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("courseName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("enterCourseName")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t("enterCourseDescription")} 
                  className="min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="schoolYearId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("schoolYear")}</FormLabel>
                <Select 
                  value={field.value.toString()} 
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectSchoolYear")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {schoolYears.map((year) => (
                      <SelectItem key={year.id} value={year.id.toString()}>
                        {year.name} {year.active && `(${t("active")})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("courseType")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectCourseType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dance">{t("dance")}</SelectItem>
                    <SelectItem value="music">{t("music")}</SelectItem>
                    <SelectItem value="culture">{t("culture")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="monthlyFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("monthlyFee")} (€)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>{t("active")}</FormLabel>
                <div className="text-sm text-muted-foreground">
                  {t("activeCourseDescription")}
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("saving")}
              </div>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
