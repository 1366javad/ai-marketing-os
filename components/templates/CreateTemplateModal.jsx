"use client";

import { useToast } from "@/hooks/use-toast";
import { X, ChevronDown } from "lucide-react";
import { useState } from "react";

function CreateTemplateModal({ setOpenModal }) {
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Blog Post");
  const [tone, setTone] = useState("Professional");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [instructions, setInstructions] = useState("");

  async function handleCreateTemplate() {
    const response = await fetch("/api/tempalates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: templateName,
        description,
        category,
        tone,
        prompt: promptTemplate,
      }),
    });

    const data = await response.json();

    if (data.success) {
      toast({
        variant: "success",
        title: "Template created",
        description: "Your Template has been created successfully.",
      });
      setOpenModal(false);
      window.location.reload();
    } else {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: data.error || "Failed to created Template.",
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`
        rounded-2xl bg-white dark:bg-gray-800 
        shadow-sm border border-gray-200 dark:border-gray-700
        transition-all duration-200
        w-full max-w-2xl max-h-[90vh] overflow-auto
      `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Template
          </h3>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setOpenModal((open) => !open)}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className={`
              w-full px-4 py-3 rounded-xl 
              border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 
              text-gray-900 dark:text-white 
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200
            `}
              placeholder="e.g. Product Launch Announcement"
            />
          </div>

          {/* Description */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`
              w-full px-4 py-3 rounded-xl resize-none
              border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 
              text-gray-900 dark:text-white 
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200
            `}
              placeholder="Short description of what this template does..."
            />
          </div>

          {/* Category + Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`
                  w-full px-4 py-3 rounded-xl appearance-none cursor-pointer
                  border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800 
                  text-gray-900 dark:text-white 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-all duration-200
                `}
                >
                  <option value="Blog Post">Blog Post</option>
                  <option value="Email">Email</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Product Description">
                    Product Description
                  </option>
                  <option value="Landing Page">Landing Page</option>
                  <option value="Newsletter">Newsletter</option>
                  <option value="Report">Report</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tone
              </label>
              <div className="relative">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className={`
                  w-full px-4 py-3 rounded-xl appearance-none cursor-pointer
                  border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800 
                  text-gray-900 dark:text-white 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-all duration-200
                `}
                >
                  <option value="Professional">Professional</option>
                  <option value="Casual">Casual</option>
                  <option value="Creative">Creative</option>
                  <option value="Academic">Academic</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Prompt Template */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompt Template
            </label>
            <textarea
              rows={4}
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className={`
              w-full px-4 py-3 rounded-xl resize-none
              border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 
              text-gray-900 dark:text-white 
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200
            `}
              placeholder="Write the main prompt structure here... Use {{variable}} for placeholders"
            />
          </div>

          {/* Instructions */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className={`
              w-full px-4 py-3 rounded-xl resize-none
              border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 
              text-gray-900 dark:text-white 
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200
            `}
              placeholder="Additional guidelines for using this template..."
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleCreateTemplate}
              className={`
              rounded-xl font-medium transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              bg-indigo-600 hover:bg-indigo-700 text-white
              shadow-lg shadow-indigo-500/30
              px-6 py-2.5 text-base flex-1
            `}
            >
              Create Template
            </button>
            <button
              onClick={() => setOpenModal(false)}
              className={`
              rounded-xl font-medium transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              border-2 border-indigo-600 text-indigo-600
              hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950
              px-6 py-2.5 text-base
            `}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default CreateTemplateModal;
