import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClassSchema, Class } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash } from "lucide-react";
import { t } from "@/lib/i18n";
import { useState } from "react";

// Customized schema for the form
const formSchema = z.object({
  name: z.string().min(1, { message: t("classNameRequired") }),
  level: z.string(),
  minAge: z.string().optional().transform(val => val === "" ? undefined : Number(val)),
  maxAge: z.string().optional().transform(val => val === "" ? undefined : Number(val)),
  maxStudents: z.string().optional().transform(val => val === "" ? undefined : Number(val)),
  schedule: z.array(z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string().optional(),
  })),
});

type ClassFormValues = z.infer<typeof formSchema>;

// Transform from form values to API values
const transformFormValues = (values: ClassFormValues, courseId: number): any => {
  return {
    ...values,
    courseId,
  };
};

interface ClassFormProps {
  classData?: Class;
  courseId: number;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function ClassForm({ classData, courseId, onSubmit, isSubmitting }: ClassFormProps) {
  // Initialize schedule items with existing data or a single empty item
  const initialSchedule = classData?.schedule && classData.schedule.length > 0
    ? classData.schedule
    : [{ day: "monday", startTime: "17:00", endTime: "18:30", location: t("classroom") + " 1" }];

  // Initialize the form with existing data or defaults
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: classData?.name || "",
      level: classData?.level || "beginner",
      minAge: classData?.minAge?.toString() || "",
      maxAge: classData?.maxAge?.toString() || "",
      maxStudents: classData?.maxStudents?.toString() || "",
      schedule: initialSchedule,
    },
  });

  // Get schedule field array from form
  const schedule = form.watch("schedule");

  // Add a new schedule item
  const addScheduleItem = () => {
    const currentSchedule = form.getValues("schedule");
    form.setValue("schedule", [
      ...currentSchedule,
      { day: "monday", startTime: "17:00", endTime: "18:30", location: "" }
    ]);
  };

  // Remove a schedule item
  const removeScheduleItem = (index: number) => {
    const currentSchedule = form.getValues("schedule");
    if (currentSchedule.length > 1) {
      form.setValue("schedule", currentSchedule.filter((_, i) => i !== index));
    }
  };

  // Handle form submission
  const handleSubmit = (values: ClassFormValues) => {
    const transformedValues = transformFormValues(values, courseId);
    onSubmit(transformedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("className")}</FormLabel>
              <FormControl>
                <Input placeholder={t("enterClassName")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("level")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectLevel")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">{t("beginner")}</SelectItem>
                    <SelectItem value="intermediate">{t("intermediate")}</SelectItem>
                    <SelectItem value="advanced">{t("advanced")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxStudents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("maxStudents")}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("minAge")}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="7" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("maxAge")}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <FormLabel>{t("schedule")}</FormLabel>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addScheduleItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("addDay")}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("day")}</TableHead>
                    <TableHead>{t("startTime")}</TableHead>
                    <TableHead>{t("endTime")}</TableHead>
                    <TableHead>{t("location")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.day}
                          onValueChange={(value) => {
                            const newSchedule = [...schedule];
                            newSchedule[index].day = value;
                            form.setValue("schedule", newSchedule);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">{t("monday")}</SelectItem>
                            <SelectItem value="tuesday">{t("tuesday")}</SelectItem>
                            <SelectItem value="wednesday">{t("wednesday")}</SelectItem>
                            <SelectItem value="thursday">{t("thursday")}</SelectItem>
                            <SelectItem value="friday">{t("friday")}</SelectItem>
                            <SelectItem value="saturday">{t("saturday")}</SelectItem>
                            <SelectItem value="sunday">{t("sunday")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={item.startTime}
                          onChange={(e) => {
                            const newSchedule = [...schedule];
                            newSchedule[index].startTime = e.target.value;
                            form.setValue("schedule", newSchedule);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={item.endTime}
                          onChange={(e) => {
                            const newSchedule = [...schedule];
                            newSchedule[index].endTime = e.target.value;
                            form.setValue("schedule", newSchedule);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.location || ""}
                          onChange={(e) => {
                            const newSchedule = [...schedule];
                            newSchedule[index].location = e.target.value;
                            form.setValue("schedule", newSchedule);
                          }}
                          placeholder={t("enterLocation")}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeScheduleItem(index)}
                          disabled={schedule.length <= 1}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

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
