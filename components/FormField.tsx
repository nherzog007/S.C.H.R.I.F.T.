import React from 'react';

interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, icon, children }) => {
  return (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
      <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
};

export default FormField;