import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSchoolYearSchema, SchoolYear } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/i18n";

// Extend the schema to include validation
const formSchema = insertSchoolYearSchema.extend({
  startDate: z.string().min(1, { message: t("startDateRequired") }),
  endDate: z.string().min(1, { message: t("endDateRequired") }),
});

type SchoolYearFormValues = z.infer<typeof formSchema>;

interface SchoolYearFormProps {
  schoolYear?: SchoolYear;
  onSubmit: (data: SchoolYearFormValues) => void;
  isSubmitting: boolean;
}

export function SchoolYearForm({ schoolYear, onSubmit, isSubmitting }: SchoolYearFormProps) {
  // Initialize the form with existing data or defaults
  const form = useForm<SchoolYearFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: schoolYear?.name || "",
      startDate: schoolYear?.startDate 
        ? new Date(schoolYear.startDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      endDate: schoolYear?.endDate 
        ? new Date(schoolYear.endDate).toISOString().split('T')[0] 
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      active: schoolYear?.active ?? true,
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
              <FormLabel>{t("schoolYearName")}</FormLabel>
              <FormControl>
                <Input placeholder="2023-2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("startDate")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("endDate")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>{t("active")}</FormLabel>
                <div className="text-sm text-muted-foreground">
                  {t("activeSchoolYearDescription")}
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
