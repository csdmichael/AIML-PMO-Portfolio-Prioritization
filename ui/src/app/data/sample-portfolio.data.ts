// Auto-generated comprehensive sample dataset for PMO Portfolio Prioritization
// Guarantees all UI screens have full 100-project data across all devices

import { PortfolioDataset, LocalDecision } from '../models/portfolio.models';
import { OptionsResponse, PortfolioItem } from '../models/api.models';

export const SAMPLE_PORTFOLIO_DATASET: PortfolioDataset = {
  "generatedAtUtc": "2026-10-14T07:00:00Z",
  "asOfDate": "2026-10-12",
  "source": "OneLake Fabric Gold (Gold.PMO_Predictions)",
  "projects": [
    {
      "projectId": "GIS-0001",
      "projectName": "Edge Network Segmentation Refresh",
      "portfolio": "IT InfoSec",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Singapore",
      "projectManager": "Mateo Okafor",
      "executiveSponsor": "Dmitri Nakamura",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2028-06-02",
      "monthsToGoLive": 29,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 8.3,
      "costEstimateUsd": 2635974,
      "dependencyCount": 1,
      "riskRating": "High",
      "effortPersonWeeks": 25,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.59,
      "quality": 0.82,
      "modelCertainty": 0.73,
      "confidenceScore": 69.8,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 73.6,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.14,
          "direction": "decreases",
          "featureValue": 29
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.13,
          "direction": "decreases",
          "featureValue": 2635974
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0002",
      "projectName": "Resilient Datacenter Consolidation Rollout",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Fremont",
      "projectManager": "Owen Brandt",
      "executiveSponsor": "Hannah Tanaka",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-03-28",
      "monthsToGoLive": 14,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 10.1,
      "costEstimateUsd": 1574629,
      "dependencyCount": 2,
      "riskRating": "Low",
      "effortPersonWeeks": 177,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.77,
      "quality": 0.82,
      "modelCertainty": 0.73,
      "confidenceScore": 78.0,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 55.1,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.44,
          "direction": "increases",
          "featureValue": 14
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.08,
          "direction": "increases",
          "featureValue": 1574629
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0003",
      "projectName": "Resilient Model Registry Migration",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Global Remote",
      "projectManager": "Owen Brandt",
      "executiveSponsor": "Leila Iyer",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2027-06-15",
      "monthsToGoLive": 17,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 10.5,
      "costEstimateUsd": 2374835,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 206,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": true
      },
      "completeness": 0.63,
      "quality": 0.76,
      "modelCertainty": 0.82,
      "confidenceScore": 71.4,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.38,
          "direction": "increases",
          "featureValue": 17
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2374835
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0004",
      "projectName": "Identity-Led API Gateway Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Finance and Controls",
      "site": "Fremont",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Lucas Schmidt",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2026-10-24",
      "monthsToGoLive": 9,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": true,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 8.9,
      "costEstimateUsd": 252072,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 148,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.68,
      "quality": 0.92,
      "modelCertainty": 0.76,
      "confidenceScore": 78.0,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 9
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.01,
          "direction": "increases",
          "featureValue": 252072
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0005",
      "projectName": "Resilient API Gateway Phase 2",
      "portfolio": "IT InfoSec",
      "businessUnit": "Fab Operations",
      "site": "Tualatin",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2026-05-08",
      "monthsToGoLive": 4,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 6.5,
      "costEstimateUsd": 1983445,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 217,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": false,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.73,
      "quality": 0.82,
      "modelCertainty": 0.88,
      "confidenceScore": 79.1,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.64,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.1,
          "direction": "increases",
          "featureValue": 1983445
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0006",
      "projectName": "Unified Cloud Landing Zone Hardening",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Penang",
      "projectManager": "Mateo Schmidt",
      "executiveSponsor": "Dmitri Nakamura",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-10-11",
      "monthsToGoLive": 21,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 9.9,
      "costEstimateUsd": 1800000,
      "dependencyCount": 3,
      "riskRating": "Medium",
      "effortPersonWeeks": 140,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.42,
      "quality": 0.8,
      "modelCertainty": 0.82,
      "confidenceScore": 63.3,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 70.9,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Add capacity",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.09,
          "direction": "increases",
          "featureValue": 1800000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0007",
      "projectName": "Automated Endpoint Hardening Upgrade",
      "portfolio": "IT InfoSec",
      "businessUnit": "Finance and Controls",
      "site": "Global Remote",
      "projectManager": "Samuel Haddad",
      "executiveSponsor": "Dmitri Nakamura",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-05-03",
      "monthsToGoLive": 16,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Project Management",
      "skillDemandFte": 11.6,
      "costEstimateUsd": 2762706,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 218,
      "sourcesPresent": 10,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.92,
      "quality": 0.83,
      "modelCertainty": 0.75,
      "confidenceScore": 85.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.4,
          "direction": "increases",
          "featureValue": 16
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.14,
          "direction": "decreases",
          "featureValue": 2762706
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0008",
      "projectName": "Next-Gen Key Vault Migration Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Human Resources",
      "site": "Tualatin",
      "projectManager": "Grace Lindqvist",
      "executiveSponsor": "Avery Bauer",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-10-01",
      "monthsToGoLive": 21,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 3.0,
      "costEstimateUsd": 4195957,
      "dependencyCount": 3,
      "riskRating": "Medium",
      "effortPersonWeeks": 96,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": false,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.42,
      "quality": 0.91,
      "modelCertainty": 0.95,
      "confidenceScore": 69.8,
      "confidenceLevel": "Medium",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 53.3,
      "ruleOverrides": [
        "R2 Executive Sponsorship",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.21,
          "direction": "decreases",
          "featureValue": 4195957
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0009",
      "projectName": "Zero-Trust Microsegmentation for Fab Floor",
      "portfolio": "IT InfoSec",
      "businessUnit": "Global Supply Chain",
      "site": "Singapore",
      "projectManager": "Elena Rostova",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-12-27",
      "monthsToGoLive": 23,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 8.3,
      "costEstimateUsd": 3200000,
      "dependencyCount": 0,
      "riskRating": "High",
      "effortPersonWeeks": 89,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.73,
      "quality": 0.94,
      "modelCertainty": 0.85,
      "confidenceScore": 82.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 91.6,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.26,
          "direction": "decreases",
          "featureValue": 23
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.16,
          "direction": "decreases",
          "featureValue": 3200000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0010",
      "projectName": "Resilient Collaboration Platform Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Hsinchu",
      "projectManager": "Jordan Okafor",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Manager",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-07-13",
      "monthsToGoLive": 18,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 0.5,
      "costEstimateUsd": 1438421,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 150,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": false,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.63,
      "quality": 0.82,
      "modelCertainty": 0.78,
      "confidenceScore": 72.7,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 82.3,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.07,
          "direction": "increases",
          "featureValue": 1438421
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0011",
      "projectName": "Resilient Service Desk Automation Upgrade",
      "portfolio": "IT InfoSec",
      "businessUnit": "Information Security",
      "site": "Hsinchu",
      "projectManager": "Isabel Brandt",
      "executiveSponsor": "Dmitri Nakamura",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2026-12-04",
      "monthsToGoLive": 11,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 9.1,
      "costEstimateUsd": 1481114,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 49,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.58,
      "quality": 0.92,
      "modelCertainty": 0.7,
      "confidenceScore": 72.3,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 95.3,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.5,
          "direction": "increases",
          "featureValue": 11
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.07,
          "direction": "increases",
          "featureValue": 1481114
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0012",
      "projectName": "Resilient Key Vault Migration Rollout",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Tualatin",
      "projectManager": "Chloe Lindqvist",
      "executiveSponsor": "Ethan Novak",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-08-22",
      "monthsToGoLive": 19,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 8.8,
      "costEstimateUsd": 629521,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 195,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.51,
      "quality": 0.89,
      "modelCertainty": 0.85,
      "confidenceScore": 71.1,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.34,
          "direction": "decreases",
          "featureValue": 19
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 629521
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0013",
      "projectName": "Resilient Key Vault Migration Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Information Security",
      "site": "Global Remote",
      "projectManager": "Mateo Schmidt",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2028-02-27",
      "monthsToGoLive": 25,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 3.7,
      "costEstimateUsd": 676703,
      "dependencyCount": 2,
      "riskRating": "Low",
      "effortPersonWeeks": 123,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.4,
      "quality": 0.85,
      "modelCertainty": 0.95,
      "confidenceScore": 66.8,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 76.7,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.22,
          "direction": "decreases",
          "featureValue": 25
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 676703
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0014",
      "projectName": "Privileged Access Management (PAM) Expansion",
      "portfolio": "IT InfoSec",
      "businessUnit": "Global Supply Chain",
      "site": "Penang",
      "projectManager": "Liam O'Connor",
      "executiveSponsor": "Samuel Lindqvist",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2026-10-07",
      "monthsToGoLive": 9,
      "businessValue": 4,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 4.1,
      "costEstimateUsd": 450000,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 192,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.68,
      "quality": 0.76,
      "modelCertainty": 0.93,
      "confidenceScore": 75.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 9
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 450000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0015",
      "projectName": "Security Operations SIEM/SOAR Automation",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Singapore",
      "projectManager": "Chloe Lindqvist",
      "executiveSponsor": "Avery Bauer",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-01-21",
      "monthsToGoLive": 24,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Project Management",
      "skillDemandFte": 3.1,
      "costEstimateUsd": 450000,
      "dependencyCount": 4,
      "riskRating": "Low",
      "effortPersonWeeks": 170,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.53,
      "quality": 0.83,
      "modelCertainty": 0.72,
      "confidenceScore": 67.3,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 89.2,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.24,
          "direction": "decreases",
          "featureValue": 24
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 450000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)",
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0016",
      "projectName": "Enterprise Cloud Posture Management",
      "portfolio": "IT InfoSec",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Global Remote",
      "projectManager": "Owen Brandt",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-07-20",
      "monthsToGoLive": 18,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 5.4,
      "costEstimateUsd": 2400000,
      "dependencyCount": 4,
      "riskRating": "Critical",
      "effortPersonWeeks": 28,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.76,
      "quality": 0.76,
      "modelCertainty": 0.77,
      "confidenceScore": 76.2,
      "confidenceLevel": "High",
      "mlTier": "Candidate to deprioritize",
      "finalTier": "Candidate to deprioritize",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.1,
        "deprioritize": 0.65
      },
      "priorityScore": 40.2,
      "ruleOverrides": [
        "R2 Executive Sponsorship",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Pause or divert skills",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2400000
        }
      ],
      "dataIssues": [
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0017",
      "projectName": "Threat Intelligence Exchange Platform",
      "portfolio": "IT InfoSec",
      "businessUnit": "Finance and Controls",
      "site": "Hsinchu",
      "projectManager": "Tariq Aziz",
      "executiveSponsor": "Klaus Weber",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2028-07-20",
      "monthsToGoLive": 30,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 6.5,
      "costEstimateUsd": 1250000,
      "dependencyCount": 3,
      "riskRating": "Critical",
      "effortPersonWeeks": 30,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.68,
      "quality": 0.87,
      "modelCertainty": 0.88,
      "confidenceScore": 78.7,
      "confidenceLevel": "High",
      "mlTier": "Candidate to deprioritize",
      "finalTier": "Candidate to deprioritize",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.1,
        "deprioritize": 0.65
      },
      "priorityScore": 41.3,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Pause or divert skills",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.12,
          "direction": "decreases",
          "featureValue": 30
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.06,
          "direction": "increases",
          "featureValue": 1250000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0018",
      "projectName": "Automated Vulnerability Patch Orchestration",
      "portfolio": "IT InfoSec",
      "businessUnit": "Finance and Controls",
      "site": "Global Remote",
      "projectManager": "Elena Rostova",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2028-03-27",
      "monthsToGoLive": 26,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 6.8,
      "costEstimateUsd": 2400000,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 59,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": false,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.56,
      "quality": 0.97,
      "modelCertainty": 0.87,
      "confidenceScore": 76.6,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 82.4,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.2,
          "direction": "decreases",
          "featureValue": 26
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2400000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0019",
      "projectName": "Next-Gen Access Certification Rollout",
      "portfolio": "IT InfoSec",
      "businessUnit": "Information Security",
      "site": "Hsinchu",
      "projectManager": "Owen Brandt",
      "executiveSponsor": "Priya Reyes",
      "sponsorLevel": "Director",
      "projectStatus": "On Hold",
      "goLiveDate": "2026-07-09",
      "monthsToGoLive": 6,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 11.5,
      "costEstimateUsd": 5020303,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 75,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.65,
      "quality": 0.93,
      "modelCertainty": 0.95,
      "confidenceScore": 80.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.6,
          "direction": "increases",
          "featureValue": 6
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.25,
          "direction": "decreases",
          "featureValue": 5020303
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0020",
      "projectName": "Next-Gen SIEM Modernization Upgrade",
      "portfolio": "IT InfoSec",
      "businessUnit": "Information Security",
      "site": "Global Remote",
      "projectManager": "Ingrid Brandt",
      "executiveSponsor": "Dmitri Nakamura",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2028-02-13",
      "monthsToGoLive": 25,
      "businessValue": 4,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 11.9,
      "costEstimateUsd": 2277974,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 120,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.65,
      "quality": 0.75,
      "modelCertainty": 0.77,
      "confidenceScore": 70.9,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 92.2,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.22,
          "direction": "decreases",
          "featureValue": 25
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.11,
          "direction": "decreases",
          "featureValue": 2277974
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0021",
      "projectName": "Hardware Security Module (HSM) Fleet Refresh",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Tualatin",
      "projectManager": "Carlos Moreno",
      "executiveSponsor": "Victor Cruz",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2026-09-10",
      "monthsToGoLive": 8,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 2.6,
      "costEstimateUsd": 2400000,
      "dependencyCount": 0,
      "riskRating": "High",
      "effortPersonWeeks": 210,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.41,
      "quality": 0.92,
      "modelCertainty": 0.79,
      "confidenceScore": 66.5,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.56,
          "direction": "increases",
          "featureValue": 8
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2400000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0022",
      "projectName": "Enterprise Data Loss Prevention (DLP) Wave 3",
      "portfolio": "IT InfoSec",
      "businessUnit": "Global Supply Chain",
      "site": "Fremont",
      "projectManager": "Marcus Chen",
      "executiveSponsor": "Lucas Schmidt",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-07-24",
      "monthsToGoLive": 30,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Integration (iPaaS)",
      "skillDemandFte": 10.9,
      "costEstimateUsd": 3200000,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 127,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.69,
      "quality": 0.9,
      "modelCertainty": 0.71,
      "confidenceScore": 76.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 90.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.12,
          "direction": "decreases",
          "featureValue": 30
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.16,
          "direction": "decreases",
          "featureValue": 3200000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0023",
      "projectName": "Next-Gen Service Desk Automation Migration",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Tualatin",
      "projectManager": "Grace Lindqvist",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2027-11-10",
      "monthsToGoLive": 22,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 3.4,
      "costEstimateUsd": 951531,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 140,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.65,
      "quality": 0.76,
      "modelCertainty": 0.92,
      "confidenceScore": 74.2,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 85.9,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.28,
          "direction": "decreases",
          "featureValue": 22
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.05,
          "direction": "increases",
          "featureValue": 951531
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0024",
      "projectName": "Cloud-First Backup Resilience Rollout",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Tualatin",
      "projectManager": "Tariq Aziz",
      "executiveSponsor": "Jordan Ferreira",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2027-02-12",
      "monthsToGoLive": 13,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 1.4,
      "costEstimateUsd": 1977643,
      "dependencyCount": 3,
      "riskRating": "Medium",
      "effortPersonWeeks": 103,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": false,
        "excelIntake": true
      },
      "completeness": 0.54,
      "quality": 0.88,
      "modelCertainty": 0.78,
      "confidenceScore": 70.7,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.46,
          "direction": "increases",
          "featureValue": 13
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.1,
          "direction": "increases",
          "featureValue": 1977643
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0025",
      "projectName": "Unified Model Registry Refresh",
      "portfolio": "IT InfoSec",
      "businessUnit": "Information Security",
      "site": "Penang",
      "projectManager": "Mateo Schmidt",
      "executiveSponsor": "Ethan Novak",
      "sponsorLevel": "Director",
      "projectStatus": "On Hold",
      "goLiveDate": "2028-02-12",
      "monthsToGoLive": 25,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 6.9,
      "costEstimateUsd": 1755495,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 36,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.75,
      "quality": 0.96,
      "modelCertainty": 0.92,
      "confidenceScore": 85.8,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 64.1,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.22,
          "direction": "decreases",
          "featureValue": 25
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.09,
          "direction": "increases",
          "featureValue": 1755495
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0026",
      "projectName": "Cloud Security Boundary Enforcement",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Hsinchu",
      "projectManager": "Mateo Okafor",
      "executiveSponsor": "Avery Bauer",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-07-14",
      "monthsToGoLive": 18,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 7.2,
      "costEstimateUsd": 6500000,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 109,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.82,
      "quality": 0.8,
      "modelCertainty": 0.82,
      "confidenceScore": 81.3,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 63.9,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0027",
      "projectName": "Edge Data Catalog Refresh",
      "portfolio": "IT InfoSec",
      "businessUnit": "Fab Operations",
      "site": "Global Remote",
      "projectManager": "Yara Walsh",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2027-02-22",
      "monthsToGoLive": 13,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 4.9,
      "costEstimateUsd": 823542,
      "dependencyCount": 3,
      "riskRating": "Low",
      "effortPersonWeeks": 138,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.76,
      "quality": 0.94,
      "modelCertainty": 0.81,
      "confidenceScore": 83.3,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 57.5,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.46,
          "direction": "increases",
          "featureValue": 13
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 823542
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0028",
      "projectName": "Identity Governance & Lifecycle Automation",
      "portfolio": "IT InfoSec",
      "businessUnit": "Human Resources",
      "site": "Hsinchu",
      "projectManager": "Liam O'Connor",
      "executiveSponsor": "Leila Iyer",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-07-03",
      "monthsToGoLive": 18,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Project Management",
      "skillDemandFte": 2.4,
      "costEstimateUsd": 450000,
      "dependencyCount": 2,
      "riskRating": "Low",
      "effortPersonWeeks": 129,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.68,
      "quality": 0.81,
      "modelCertainty": 0.79,
      "confidenceScore": 74.8,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 86.2,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 450000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0029",
      "projectName": "Zero-Trust Service Desk Automation Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Singapore",
      "projectManager": "Leila Patel",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2027-08-10",
      "monthsToGoLive": 19,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 7.0,
      "costEstimateUsd": 510000,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 157,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.71,
      "quality": 0.9,
      "modelCertainty": 0.7,
      "confidenceScore": 77.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 91.7,
      "ruleOverrides": [
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.34,
          "direction": "decreases",
          "featureValue": 19
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 510000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0030",
      "projectName": "Identity-Led Identity Federation Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Customer Services",
      "site": "Tualatin",
      "projectManager": "Carlos Moreno",
      "executiveSponsor": "Yara Iyer",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2027-07-02",
      "monthsToGoLive": 18,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 4.0,
      "costEstimateUsd": 4780051,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 56,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.79,
      "quality": 0.79,
      "modelCertainty": 0.84,
      "confidenceScore": 80.0,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 95.6,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.24,
          "direction": "decreases",
          "featureValue": 4780051
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0031",
      "projectName": "Secure Data Catalog Program",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Tualatin",
      "projectManager": "Isabel Okafor",
      "executiveSponsor": "Samuel Lindqvist",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2027-04-20",
      "monthsToGoLive": 15,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 8.8,
      "costEstimateUsd": 5498832,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 97,
      "sourcesPresent": 10,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.9,
      "quality": 0.92,
      "modelCertainty": 0.94,
      "confidenceScore": 91.5,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 54.9,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.42,
          "direction": "increases",
          "featureValue": 15
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.27,
          "direction": "decreases",
          "featureValue": 5498832
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0032",
      "projectName": "Cloud-First Data Catalog Upgrade",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Fremont",
      "projectManager": "Jordan Okafor",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-06-09",
      "monthsToGoLive": 17,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 9.4,
      "costEstimateUsd": 2291540,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 197,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.85,
      "quality": 0.8,
      "modelCertainty": 0.78,
      "confidenceScore": 81.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 89.7,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.38,
          "direction": "increases",
          "featureValue": 17
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.11,
          "direction": "decreases",
          "featureValue": 2291540
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0033",
      "projectName": "Secure Patch Orchestration Refresh",
      "portfolio": "IT InfoSec",
      "businessUnit": "Finance and Controls",
      "site": "Singapore",
      "projectManager": "Jordan Okafor",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-11-09",
      "monthsToGoLive": 22,
      "businessValue": 1,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 6.8,
      "costEstimateUsd": 1290000,
      "dependencyCount": 0,
      "riskRating": "High",
      "effortPersonWeeks": 86,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.7,
      "quality": 0.85,
      "modelCertainty": 0.85,
      "confidenceScore": 78.3,
      "confidenceLevel": "High",
      "mlTier": "Candidate to deprioritize",
      "finalTier": "Candidate to deprioritize",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.1,
        "deprioritize": 0.65
      },
      "priorityScore": 23.4,
      "ruleOverrides": [],
      "recommendedAction": "Pause or divert skills",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.18,
          "direction": "decreases",
          "featureValue": 1
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.28,
          "direction": "decreases",
          "featureValue": 22
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.06,
          "direction": "increases",
          "featureValue": 1290000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0034",
      "projectName": "Secure Service Desk Automation Rollout",
      "portfolio": "IT InfoSec",
      "businessUnit": "Digital Transformation",
      "site": "Hsinchu",
      "projectManager": "Owen Aziz",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Manager",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-03-15",
      "monthsToGoLive": 14,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 11.0,
      "costEstimateUsd": 356206,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 86,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": true
      },
      "completeness": 0.73,
      "quality": 0.8,
      "modelCertainty": 0.75,
      "confidenceScore": 75.9,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 57.5,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.44,
          "direction": "increases",
          "featureValue": 14
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 356206
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0035",
      "projectName": "Enterprise Ticketing Integration Upgrade",
      "portfolio": "IT InfoSec",
      "businessUnit": "Corporate IT",
      "site": "Fremont",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Ethan Novak",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-06-22",
      "monthsToGoLive": 29,
      "businessValue": 1,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 9.3,
      "costEstimateUsd": 4207688,
      "dependencyCount": 3,
      "riskRating": "Low",
      "effortPersonWeeks": 169,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.67,
      "quality": 0.76,
      "modelCertainty": 0.8,
      "confidenceScore": 72.8,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 49.4,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.18,
          "direction": "decreases",
          "featureValue": 1
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.14,
          "direction": "decreases",
          "featureValue": 29
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.21,
          "direction": "decreases",
          "featureValue": 4207688
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0036",
      "projectName": "Cyber Defense SOC Playbook Orchestration",
      "portfolio": "IT InfoSec",
      "businessUnit": "Manufacturing Engineering",
      "site": "Penang",
      "projectManager": "Owen Aziz",
      "executiveSponsor": "Samuel Lindqvist",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-10-10",
      "monthsToGoLive": 21,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 3.5,
      "costEstimateUsd": 3132457,
      "dependencyCount": 3,
      "riskRating": "Medium",
      "effortPersonWeeks": 110,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.68,
      "quality": 0.83,
      "modelCertainty": 0.92,
      "confidenceScore": 78.1,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 55.0,
      "ruleOverrides": [
        "R2 Executive Sponsorship",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.16,
          "direction": "decreases",
          "featureValue": 3132457
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0037",
      "projectName": "Zero Trust Network Access (ZTNA) Deployment",
      "portfolio": "IT InfoSec",
      "businessUnit": "Fab Operations",
      "site": "Singapore",
      "projectManager": "Priya Okafor",
      "executiveSponsor": "Jordan Moreno",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2027-01-21",
      "monthsToGoLive": 12,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 11.1,
      "costEstimateUsd": 599099,
      "dependencyCount": 0,
      "riskRating": "High",
      "effortPersonWeeks": 206,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.68,
      "quality": 0.87,
      "modelCertainty": 0.86,
      "confidenceScore": 78.3,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 90.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.48,
          "direction": "increases",
          "featureValue": 12
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 599099
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0038",
      "projectName": "Secure Cloud DevOps Pipeline Verification",
      "portfolio": "IT InfoSec",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Tualatin",
      "projectManager": "Yara Gallagher",
      "executiveSponsor": "Nadia Novak",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-01-06",
      "monthsToGoLive": 24,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Integration (iPaaS)",
      "skillDemandFte": 1.0,
      "costEstimateUsd": 1160629,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 26,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.68,
      "quality": 0.93,
      "modelCertainty": 0.87,
      "confidenceScore": 80.6,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 93.7,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.24,
          "direction": "decreases",
          "featureValue": 24
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.06,
          "direction": "increases",
          "featureValue": 1160629
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0039",
      "projectName": "Third-Party Risk Assessment Engine",
      "portfolio": "IT InfoSec",
      "businessUnit": "Information Security",
      "site": "Fremont",
      "projectManager": "Isabel Brandt",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2027-07-11",
      "monthsToGoLive": 18,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Project Management",
      "skillDemandFte": 2.3,
      "costEstimateUsd": 1800000,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 87,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.82,
      "quality": 0.87,
      "modelCertainty": 0.95,
      "confidenceScore": 86.3,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 93.0,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.09,
          "direction": "increases",
          "featureValue": 1800000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0040",
      "projectName": "Cryptographic Asset Discovery & Audit",
      "portfolio": "IT InfoSec",
      "businessUnit": "Corporate IT",
      "site": "Fremont",
      "projectManager": "Isabel Brandt",
      "executiveSponsor": "Samuel Lindqvist",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2026-05-09",
      "monthsToGoLive": 4,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 1.8,
      "costEstimateUsd": 443756,
      "dependencyCount": 3,
      "riskRating": "Medium",
      "effortPersonWeeks": 140,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.59,
      "quality": 0.95,
      "modelCertainty": 0.85,
      "confidenceScore": 76.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 89.1,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.64,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 443756
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0041",
      "projectName": "Core MES Fab Yield Telemetry Connector",
      "portfolio": "IT Software Development",
      "businessUnit": "Manufacturing Engineering",
      "site": "Hsinchu",
      "projectManager": "Ingrid Brandt",
      "executiveSponsor": "Elena Ferreira",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-01-19",
      "monthsToGoLive": 12,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 8.0,
      "costEstimateUsd": 1638494,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 216,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.77,
      "quality": 0.89,
      "modelCertainty": 0.86,
      "confidenceScore": 83.0,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.48,
          "direction": "increases",
          "featureValue": 12
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.08,
          "direction": "increases",
          "featureValue": 1638494
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0042",
      "projectName": "Wafer Chamber Metrology Stream Processing",
      "portfolio": "IT Software Development",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Singapore",
      "projectManager": "Leila Patel",
      "executiveSponsor": "Ethan Novak",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2027-06-19",
      "monthsToGoLive": 17,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 3.9,
      "costEstimateUsd": 992310,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 30,
      "sourcesPresent": 4,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.4,
      "quality": 0.92,
      "modelCertainty": 0.88,
      "confidenceScore": 67.8,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.3,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.38,
          "direction": "increases",
          "featureValue": 17
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.05,
          "direction": "increases",
          "featureValue": 992310
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0043",
      "projectName": "Global ERP Supply Chain Inventory Bridge",
      "portfolio": "IT Software Development",
      "businessUnit": "Fab Operations",
      "site": "Tualatin",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Isabel Moreno",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-01-05",
      "monthsToGoLive": 12,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 11.2,
      "costEstimateUsd": 840237,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 70,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.85,
      "quality": 0.77,
      "modelCertainty": 0.81,
      "confidenceScore": 81.4,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 62.7,
      "ruleOverrides": [],
      "recommendedAction": "Add capacity",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.48,
          "direction": "increases",
          "featureValue": 12
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 840237
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0044",
      "projectName": "Supplier Portal Modernization & EDI Hub",
      "portfolio": "IT Software Development",
      "businessUnit": "Human Resources",
      "site": "Hsinchu",
      "projectManager": "Leila Patel",
      "executiveSponsor": "Priya Kowalski",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-09-09",
      "monthsToGoLive": 20,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 3.5,
      "costEstimateUsd": 578435,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 183,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.69,
      "quality": 0.92,
      "modelCertainty": 0.77,
      "confidenceScore": 78.7,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 49.1,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.32,
          "direction": "decreases",
          "featureValue": 20
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 578435
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0045",
      "projectName": "Customer Services Remote Diagnostics API",
      "portfolio": "IT Software Development",
      "businessUnit": "Finance and Controls",
      "site": "Penang",
      "projectManager": "Mateo Moreno",
      "executiveSponsor": "Nadia Novak",
      "sponsorLevel": "Director",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-05-18",
      "monthsToGoLive": 16,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 6.0,
      "costEstimateUsd": 650000,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 89,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.7,
      "quality": 0.93,
      "modelCertainty": 0.73,
      "confidenceScore": 78.7,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.4,
          "direction": "increases",
          "featureValue": 16
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 650000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0046",
      "projectName": "Enterprise Master Data Management Service",
      "portfolio": "IT Software Development",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Global Remote",
      "projectManager": "Carlos Moreno",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-07-25",
      "monthsToGoLive": 18,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 11.4,
      "costEstimateUsd": 1530303,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 218,
      "sourcesPresent": 11,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.97,
      "quality": 0.94,
      "modelCertainty": 0.84,
      "confidenceScore": 93.3,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 77.8,
      "ruleOverrides": [],
      "recommendedAction": "Add capacity",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.08,
          "direction": "increases",
          "featureValue": 1530303
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0047",
      "projectName": "HR Onboarding Workflow Digital Assistant",
      "portfolio": "IT Software Development",
      "businessUnit": "Corporate IT",
      "site": "Singapore",
      "projectManager": "Tariq Aziz",
      "executiveSponsor": "Marcus Bauer",
      "sponsorLevel": "Executive",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-04-06",
      "monthsToGoLive": 15,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 10.2,
      "costEstimateUsd": 315973,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 79,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.6,
      "quality": 0.93,
      "modelCertainty": 0.84,
      "confidenceScore": 76.4,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 78.2,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Add capacity",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.42,
          "direction": "increases",
          "featureValue": 15
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 315973
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0048",
      "projectName": "Finance Billing & Revenue Recognition Engine",
      "portfolio": "IT Software Development",
      "businessUnit": "Global Supply Chain",
      "site": "Singapore",
      "projectManager": "Mateo Moreno",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Manager",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-06-04",
      "monthsToGoLive": 17,
      "businessValue": 4,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": true,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 1.8,
      "costEstimateUsd": 352682,
      "dependencyCount": 1,
      "riskRating": "High",
      "effortPersonWeeks": 146,
      "sourcesPresent": 10,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.88,
      "quality": 0.76,
      "modelCertainty": 0.93,
      "confidenceScore": 84.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.38,
          "direction": "increases",
          "featureValue": 17
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 352682
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0049",
      "projectName": "Production Dispatch Automation Service",
      "portfolio": "IT Software Development",
      "businessUnit": "Manufacturing Engineering",
      "site": "Singapore",
      "projectManager": "Marcus Chen",
      "executiveSponsor": "Hannah Tanaka",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-03-11",
      "monthsToGoLive": 14,
      "businessValue": 5,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Integration (iPaaS)",
      "skillDemandFte": 5.2,
      "costEstimateUsd": 6500000,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 174,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": false,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.58,
      "quality": 0.85,
      "modelCertainty": 0.7,
      "confidenceScore": 69.8,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.44,
          "direction": "increases",
          "featureValue": 14
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0050",
      "projectName": "Tool Calibration Event Dispatcher",
      "portfolio": "IT Software Development",
      "businessUnit": "Finance and Controls",
      "site": "Global Remote",
      "projectManager": "Amira Khan",
      "executiveSponsor": "Nadia Al-Mansoor",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2028-01-09",
      "monthsToGoLive": 24,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 7.7,
      "costEstimateUsd": 450000,
      "dependencyCount": 3,
      "riskRating": "High",
      "effortPersonWeeks": 195,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.57,
      "quality": 0.83,
      "modelCertainty": 0.9,
      "confidenceScore": 72.7,
      "confidenceLevel": "Medium",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 59.8,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.24,
          "direction": "decreases",
          "featureValue": 24
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 450000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0051",
      "projectName": "Engineering Change Order (ECO) Pipeline",
      "portfolio": "IT Software Development",
      "businessUnit": "Fab Operations",
      "site": "Tualatin",
      "projectManager": "Mateo Okafor",
      "executiveSponsor": "Jordan Ferreira",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2028-11-08",
      "monthsToGoLive": 34,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 6.6,
      "costEstimateUsd": 581339,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 196,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.52,
      "quality": 0.77,
      "modelCertainty": 0.78,
      "confidenceScore": 66.0,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 71.3,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.04,
          "direction": "decreases",
          "featureValue": 34
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 581339
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0052",
      "projectName": "Automated Regression Test Harness for MES",
      "portfolio": "IT Software Development",
      "businessUnit": "Corporate IT",
      "site": "Penang",
      "projectManager": "Priya Okafor",
      "executiveSponsor": "Marcus Bauer",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-05-02",
      "monthsToGoLive": 16,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 5.6,
      "costEstimateUsd": 2380617,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 49,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.45,
      "quality": 0.94,
      "modelCertainty": 0.76,
      "confidenceScore": 68.3,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 97.3,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.4,
          "direction": "increases",
          "featureValue": 16
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2380617
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0053",
      "projectName": "B2B Customer Order Tracking Gateway",
      "portfolio": "IT Software Development",
      "businessUnit": "Global Supply Chain",
      "site": "Fremont",
      "projectManager": "Elena Novak",
      "executiveSponsor": "Leila Iyer",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-03-03",
      "monthsToGoLive": 14,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 4.2,
      "costEstimateUsd": 602118,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 184,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.6,
      "quality": 0.89,
      "modelCertainty": 0.87,
      "confidenceScore": 75.6,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 65.6,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.44,
          "direction": "increases",
          "featureValue": 14
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 602118
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0054",
      "projectName": "Logistics Freight Cost Optimization Engine",
      "portfolio": "IT Software Development",
      "businessUnit": "Human Resources",
      "site": "Singapore",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Jordan Moreno",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2028-05-10",
      "monthsToGoLive": 28,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 10.9,
      "costEstimateUsd": 3399968,
      "dependencyCount": 2,
      "riskRating": "Low",
      "effortPersonWeeks": 90,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.81,
      "quality": 0.78,
      "modelCertainty": 0.89,
      "confidenceScore": 81.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 83.2,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.16,
          "direction": "decreases",
          "featureValue": 28
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.17,
          "direction": "decreases",
          "featureValue": 3399968
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0055",
      "projectName": "Global Asset Tracking & RFID Integration",
      "portfolio": "IT Software Development",
      "businessUnit": "Information Security",
      "site": "Hsinchu",
      "projectManager": "Kenji Kim",
      "executiveSponsor": "Sofia Schmidt",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2026-08-17",
      "monthsToGoLive": 7,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 1.0,
      "costEstimateUsd": 3364861,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 217,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.66,
      "quality": 0.81,
      "modelCertainty": 0.78,
      "confidenceScore": 73.7,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 77.3,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.58,
          "direction": "increases",
          "featureValue": 7
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.17,
          "direction": "decreases",
          "featureValue": 3364861
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0056",
      "projectName": "Field Service Mobile App Backend V2",
      "portfolio": "IT Software Development",
      "businessUnit": "Digital Transformation",
      "site": "Global Remote",
      "projectManager": "Sophia Patel",
      "executiveSponsor": "Samuel Lindqvist",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-06-27",
      "monthsToGoLive": 17,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 10.1,
      "costEstimateUsd": 4800000,
      "dependencyCount": 4,
      "riskRating": "Medium",
      "effortPersonWeeks": 59,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.7,
      "quality": 0.93,
      "modelCertainty": 0.75,
      "confidenceScore": 79.1,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 90.4,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.38,
          "direction": "increases",
          "featureValue": 17
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.24,
          "direction": "decreases",
          "featureValue": 4800000
        }
      ],
      "dataIssues": [
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0057",
      "projectName": "Corporate Portal Unified Search Index",
      "portfolio": "IT Software Development",
      "businessUnit": "semiconductor process equipment",
      "site": "Tualatin",
      "projectManager": "Lucas Chen",
      "executiveSponsor": "Marcus Bauer",
      "sponsorLevel": "Executive",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-09-09",
      "monthsToGoLive": 20,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 3.9,
      "costEstimateUsd": 259244,
      "dependencyCount": 1,
      "riskRating": "High",
      "effortPersonWeeks": 215,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": false,
        "excelIntake": true
      },
      "completeness": 0.86,
      "quality": 0.87,
      "modelCertainty": 0.84,
      "confidenceScore": 86.0,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 57.7,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.32,
          "direction": "decreases",
          "featureValue": 20
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.01,
          "direction": "increases",
          "featureValue": 259244
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0058",
      "projectName": "Enterprise Notification & Alert Dispatcher",
      "portfolio": "IT Software Development",
      "businessUnit": "Manufacturing Engineering",
      "site": "Penang",
      "projectManager": "Tariq Aziz",
      "executiveSponsor": "Marcus Bauer",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-12-27",
      "monthsToGoLive": 23,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 11.3,
      "costEstimateUsd": 997371,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 83,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.69,
      "quality": 0.91,
      "modelCertainty": 0.78,
      "confidenceScore": 78.5,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 43.0,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.26,
          "direction": "decreases",
          "featureValue": 23
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.05,
          "direction": "increases",
          "featureValue": 997371
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0059",
      "projectName": "Real-time Defect Classification Service",
      "portfolio": "IT Software Development",
      "businessUnit": "Corporate IT",
      "site": "Singapore",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2028-02-18",
      "monthsToGoLive": 25,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 7.3,
      "costEstimateUsd": 1250000,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 95,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.63,
      "quality": 0.86,
      "modelCertainty": 0.92,
      "confidenceScore": 76.9,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 76.8,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.22,
          "direction": "decreases",
          "featureValue": 25
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.06,
          "direction": "increases",
          "featureValue": 1250000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0060",
      "projectName": "Product Lifecycle Management (PLM) Connector",
      "portfolio": "IT Software Development",
      "businessUnit": "Information Security",
      "site": "Fremont",
      "projectManager": "Grace Lindqvist",
      "executiveSponsor": "Sofia Schmidt",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-03-10",
      "monthsToGoLive": 26,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 8.5,
      "costEstimateUsd": 1295849,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 119,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": false,
        "excelIntake": true
      },
      "completeness": 0.72,
      "quality": 0.88,
      "modelCertainty": 0.84,
      "confidenceScore": 80.0,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 85.9,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.2,
          "direction": "decreases",
          "featureValue": 26
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.06,
          "direction": "increases",
          "featureValue": 1295849
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0061",
      "projectName": "Global SD-WAN Branch Modernization",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Fab Operations",
      "site": "Fremont",
      "projectManager": "Marcus Aziz",
      "executiveSponsor": "Avery Bauer",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2027-12-05",
      "monthsToGoLive": 23,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 10.4,
      "costEstimateUsd": 4248662,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 218,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.57,
      "quality": 0.85,
      "modelCertainty": 0.94,
      "confidenceScore": 74.2,
      "confidenceLevel": "Medium",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 56.5,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.26,
          "direction": "decreases",
          "featureValue": 23
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.21,
          "direction": "decreases",
          "featureValue": 4248662
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0062",
      "projectName": "Multi-Cloud Transit Network Backbone",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Global Supply Chain",
      "site": "Penang",
      "projectManager": "Ingrid Brandt",
      "executiveSponsor": "Carlos Tanaka",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2026-11-15",
      "monthsToGoLive": 10,
      "businessValue": 5,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Application Development",
      "skillDemandFte": 6.3,
      "costEstimateUsd": 1070000,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 167,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.41,
      "quality": 0.9,
      "modelCertainty": 0.94,
      "confidenceScore": 68.8,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.52,
          "direction": "increases",
          "featureValue": 10
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.05,
          "direction": "increases",
          "featureValue": 1070000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0063",
      "projectName": "High-Performance Compute Cluster Expansion",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Global Supply Chain",
      "site": "Fremont",
      "projectManager": "Sophia Patel",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Executive",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-07-22",
      "monthsToGoLive": 18,
      "businessValue": 5,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": true,
      "primarySkill": "Integration (iPaaS)",
      "skillDemandFte": 5.0,
      "costEstimateUsd": 4800000,
      "dependencyCount": 3,
      "riskRating": "High",
      "effortPersonWeeks": 220,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.53,
      "quality": 0.95,
      "modelCertainty": 0.92,
      "confidenceScore": 75.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.24,
          "direction": "decreases",
          "featureValue": 4800000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0064",
      "projectName": "Disaster Recovery Storage Replication Hub",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Fab Operations",
      "site": "Global Remote",
      "projectManager": "Sofia Kim",
      "executiveSponsor": "Daniel Patel",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2028-09-04",
      "monthsToGoLive": 32,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 8.9,
      "costEstimateUsd": 881210,
      "dependencyCount": 2,
      "riskRating": "Low",
      "effortPersonWeeks": 58,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.46,
      "quality": 0.87,
      "modelCertainty": 0.7,
      "confidenceScore": 65.2,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 70.5,
      "ruleOverrides": [],
      "recommendedAction": "Add capacity",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.08,
          "direction": "decreases",
          "featureValue": 32
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 881210
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0065",
      "projectName": "Global Virtual Desktop Infrastructure (VDI)",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Digital Transformation",
      "site": "Fremont",
      "projectManager": "Sophia Patel",
      "executiveSponsor": "Ethan Novak",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2027-02-13",
      "monthsToGoLive": 13,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Project Management",
      "skillDemandFte": 11.2,
      "costEstimateUsd": 3200000,
      "dependencyCount": 1,
      "riskRating": "High",
      "effortPersonWeeks": 137,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.74,
      "quality": 0.96,
      "modelCertainty": 0.91,
      "confidenceScore": 85.1,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.46,
          "direction": "increases",
          "featureValue": 13
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.16,
          "direction": "decreases",
          "featureValue": 3200000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0066",
      "projectName": "Automated Server Patching & Compliance Guard",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Fab Operations",
      "site": "Tualatin",
      "projectManager": "Owen Brandt",
      "executiveSponsor": "Leila Iyer",
      "sponsorLevel": "Executive",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-06-12",
      "monthsToGoLive": 17,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 7.4,
      "costEstimateUsd": 661384,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 61,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.64,
      "quality": 0.76,
      "modelCertainty": 0.88,
      "confidenceScore": 73.0,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 82.2,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.38,
          "direction": "increases",
          "featureValue": 17
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 661384
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0067",
      "projectName": "Edge Compute Gateway for Cleanroom Robots",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Fab Operations",
      "site": "Fremont",
      "projectManager": "Chloe Iyer",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2028-11-05",
      "monthsToGoLive": 34,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 10.6,
      "costEstimateUsd": 764752,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 193,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.69,
      "quality": 0.82,
      "modelCertainty": 0.78,
      "confidenceScore": 75.3,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 57.0,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.04,
          "direction": "decreases",
          "featureValue": 34
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 764752
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0068",
      "projectName": "Enterprise Unified Storage Tiering",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Human Resources",
      "site": "Tualatin",
      "projectManager": "Mateo Okafor",
      "executiveSponsor": "Rahul Aziz",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-07-16",
      "monthsToGoLive": 18,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 6.1,
      "costEstimateUsd": 491737,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 187,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.61,
      "quality": 0.94,
      "modelCertainty": 0.87,
      "confidenceScore": 77.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 84.6,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 491737
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0069",
      "projectName": "Corporate DNS & DHCP Infrastructure Modernization",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Human Resources",
      "site": "Penang",
      "projectManager": "Carlos Aziz",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2027-10-09",
      "monthsToGoLive": 21,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 3.0,
      "costEstimateUsd": 1374345,
      "dependencyCount": 1,
      "riskRating": "High",
      "effortPersonWeeks": 92,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.7,
      "quality": 0.92,
      "modelCertainty": 0.71,
      "confidenceScore": 77.9,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 77.2,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.07,
          "direction": "increases",
          "featureValue": 1374345
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0070",
      "projectName": "Zero Trust Wi-Fi 6E Fab Deployment",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Customer Services",
      "site": "Singapore",
      "projectManager": "Ingrid Brandt",
      "executiveSponsor": "Carlos Tanaka",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2028-04-21",
      "monthsToGoLive": 27,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 3.4,
      "costEstimateUsd": 490756,
      "dependencyCount": 1,
      "riskRating": "High",
      "effortPersonWeeks": 190,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.57,
      "quality": 0.97,
      "modelCertainty": 0.84,
      "confidenceScore": 76.4,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 68.6,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Security",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.18,
          "direction": "decreases",
          "featureValue": 27
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 490756
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0071",
      "projectName": "Hybrid Cloud Container Mesh Infrastructure",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Manufacturing Engineering",
      "site": "Tualatin",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Hannah Tanaka",
      "sponsorLevel": "Director",
      "projectStatus": "On Hold",
      "goLiveDate": "2027-07-22",
      "monthsToGoLive": 18,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 3.1,
      "costEstimateUsd": 780000,
      "dependencyCount": 4,
      "riskRating": "High",
      "effortPersonWeeks": 219,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": false,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.55,
      "quality": 0.79,
      "modelCertainty": 0.79,
      "confidenceScore": 68.2,
      "confidenceLevel": "Medium",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 53.8,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Re-sequence",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.36,
          "direction": "increases",
          "featureValue": 18
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 780000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)",
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0072",
      "projectName": "Database Fleet Autonomous Backup & Restore",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Human Resources",
      "site": "Singapore",
      "projectManager": "Mateo Iyer",
      "executiveSponsor": "Carlos Tanaka",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2028-05-06",
      "monthsToGoLive": 28,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 11.5,
      "costEstimateUsd": 3020400,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 62,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.77,
      "quality": 0.97,
      "modelCertainty": 0.76,
      "confidenceScore": 83.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 86.8,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.16,
          "direction": "decreases",
          "featureValue": 28
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.15,
          "direction": "decreases",
          "featureValue": 3020400
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0073",
      "projectName": "Global Datacenter Power & Cooling Telemetry",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Finance and Controls",
      "site": "Tualatin",
      "projectManager": "Ingrid Sullivan",
      "executiveSponsor": "Jordan Moreno",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2026-05-04",
      "monthsToGoLive": 4,
      "businessValue": 1,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 7.8,
      "costEstimateUsd": 6671465,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 163,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.62,
      "quality": 0.89,
      "modelCertainty": 0.88,
      "confidenceScore": 76.7,
      "confidenceLevel": "High",
      "mlTier": "Candidate to deprioritize",
      "finalTier": "Candidate to deprioritize",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.1,
        "deprioritize": 0.65
      },
      "priorityScore": 39.5,
      "ruleOverrides": [],
      "recommendedAction": "Pause or divert skills",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.18,
          "direction": "decreases",
          "featureValue": 1
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.64,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6671465
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0074",
      "projectName": "Colocation Datacenter Migration Wave 4",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Semiconductor Process Equipment",
      "site": "Tualatin",
      "projectManager": "Chloe Lindqvist",
      "executiveSponsor": "Rahul Aziz",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2026-12-04",
      "monthsToGoLive": 11,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 7.5,
      "costEstimateUsd": 598587,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 198,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.59,
      "quality": 0.84,
      "modelCertainty": 0.76,
      "confidenceScore": 71.2,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 61.5,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.5,
          "direction": "increases",
          "featureValue": 11
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 598587
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0075",
      "projectName": "Campus Fiber Network Spine-Leaf Upgrade",
      "portfolio": "IT Infrastructure",
      "businessUnit": "Information Security",
      "site": "Tualatin",
      "projectManager": "Isabel Okafor",
      "executiveSponsor": "Lucas Schmidt",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-12-03",
      "monthsToGoLive": 23,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 6.4,
      "costEstimateUsd": 1800000,
      "dependencyCount": 3,
      "riskRating": "Low",
      "effortPersonWeeks": 48,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.51,
      "quality": 0.96,
      "modelCertainty": 0.84,
      "confidenceScore": 73.4,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Platform",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.26,
          "direction": "decreases",
          "featureValue": 23
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.09,
          "direction": "increases",
          "featureValue": 1800000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0076",
      "projectName": "Wafer Defect Computer Vision Inspection AI",
      "portfolio": "AI Team",
      "businessUnit": "Information Security",
      "site": "Tualatin",
      "projectManager": "Elena Novak",
      "executiveSponsor": "Leila Iyer",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-12-15",
      "monthsToGoLive": 23,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": true,
      "primarySkill": "Integration (iPaaS)",
      "skillDemandFte": 6.3,
      "costEstimateUsd": 685316,
      "dependencyCount": 2,
      "riskRating": "Critical",
      "effortPersonWeeks": 144,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.85,
      "quality": 0.84,
      "modelCertainty": 0.83,
      "confidenceScore": 84.2,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.26,
          "direction": "decreases",
          "featureValue": 23
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 685316
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0077",
      "projectName": "Generative AI Knowledge Assistant for Fab Engineers",
      "portfolio": "AI Team",
      "businessUnit": "Digital Transformation",
      "site": "Fremont",
      "projectManager": "Jordan Aziz",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2026-08-09",
      "monthsToGoLive": 7,
      "businessValue": 2,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 4.8,
      "costEstimateUsd": 2238353,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 69,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.83,
      "quality": 0.89,
      "modelCertainty": 0.87,
      "confidenceScore": 85.9,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 78.9,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.58,
          "direction": "increases",
          "featureValue": 7
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.11,
          "direction": "decreases",
          "featureValue": 2238353
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0078",
      "projectName": "Predictive Equipment Maintenance Anomaly Detector",
      "portfolio": "AI Team",
      "businessUnit": "Customer Services",
      "site": "Global Remote",
      "projectManager": "Sophia Patel",
      "executiveSponsor": "Samuel Lindqvist",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2026-10-13",
      "monthsToGoLive": 9,
      "businessValue": 4,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": true,
      "primarySkill": "Project Management",
      "skillDemandFte": 2.8,
      "costEstimateUsd": 2400000,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 209,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.64,
      "quality": 0.95,
      "modelCertainty": 0.9,
      "confidenceScore": 80.1,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 9
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2400000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0079",
      "projectName": "Supply Chain Disruption Forecasting Model",
      "portfolio": "AI Team",
      "businessUnit": "Fab Operations",
      "site": "Tualatin",
      "projectManager": "Marcus Aziz",
      "executiveSponsor": "Lucas Schmidt",
      "sponsorLevel": "Director",
      "projectStatus": "Planning",
      "goLiveDate": "2028-11-06",
      "monthsToGoLive": 34,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 4.1,
      "costEstimateUsd": 1502826,
      "dependencyCount": 2,
      "riskRating": "Low",
      "effortPersonWeeks": 109,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.51,
      "quality": 0.75,
      "modelCertainty": 0.73,
      "confidenceScore": 63.8,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 67.6,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.04,
          "direction": "decreases",
          "featureValue": 34
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.08,
          "direction": "increases",
          "featureValue": 1502826
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0080",
      "projectName": "Automated Recipe Optimization Deep Learning",
      "portfolio": "AI Team",
      "businessUnit": "Corporate IT",
      "site": "Singapore",
      "projectManager": "Kenji Kim",
      "executiveSponsor": "Sofia Schmidt",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-02-07",
      "monthsToGoLive": 25,
      "businessValue": 1,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 6.0,
      "costEstimateUsd": 1349076,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 144,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.61,
      "quality": 0.87,
      "modelCertainty": 0.72,
      "confidenceScore": 72.3,
      "confidenceLevel": "Medium",
      "mlTier": "Candidate to deprioritize",
      "finalTier": "Candidate to deprioritize",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.1,
        "deprioritize": 0.65
      },
      "priorityScore": 21.8,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Pause or divert skills",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.18,
          "direction": "decreases",
          "featureValue": 1
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.22,
          "direction": "decreases",
          "featureValue": 25
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.07,
          "direction": "increases",
          "featureValue": 1349076
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0081",
      "projectName": "Enterprise LLM Model Serving Gateway",
      "portfolio": "AI Team",
      "businessUnit": "Global Supply Chain",
      "site": "Tualatin",
      "projectManager": "Isabel Brandt",
      "executiveSponsor": "Priya Reyes",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2027-09-19",
      "monthsToGoLive": 20,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 5.2,
      "costEstimateUsd": 4800000,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 65,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.43,
      "quality": 0.85,
      "modelCertainty": 0.83,
      "confidenceScore": 65.7,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 68.1,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.32,
          "direction": "decreases",
          "featureValue": 20
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.24,
          "direction": "decreases",
          "featureValue": 4800000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0082",
      "projectName": "AI-Powered Contract Review & Compliance Scanner",
      "portfolio": "AI Team",
      "businessUnit": "Finance and Controls",
      "site": "Tualatin",
      "projectManager": "Grace Lindqvist",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2027-10-06",
      "monthsToGoLive": 21,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 2.3,
      "costEstimateUsd": 6500000,
      "dependencyCount": 1,
      "riskRating": "Low",
      "effortPersonWeeks": 164,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.52,
      "quality": 0.84,
      "modelCertainty": 0.74,
      "confidenceScore": 67.6,
      "confidenceLevel": "Medium",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 52.9,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0083",
      "projectName": "Autonomous Robotic Process AI Co-Pilot",
      "portfolio": "AI Team",
      "businessUnit": "Manufacturing Engineering",
      "site": "Hsinchu",
      "projectManager": "Owen Aziz",
      "executiveSponsor": "Nadia Novak",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-04-13",
      "monthsToGoLive": 15,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 2.2,
      "costEstimateUsd": 2170956,
      "dependencyCount": 0,
      "riskRating": "Critical",
      "effortPersonWeeks": 105,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.71,
      "quality": 0.95,
      "modelCertainty": 0.73,
      "confidenceScore": 79.8,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 74.9,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.42,
          "direction": "increases",
          "featureValue": 15
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.11,
          "direction": "decreases",
          "featureValue": 2170956
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0084",
      "projectName": "Smart Energy Consumption Optimizer for Cleanrooms",
      "portfolio": "AI Team",
      "businessUnit": "Global Supply Chain",
      "site": "Tualatin",
      "projectManager": "Elena Rostova",
      "executiveSponsor": "Hannah Tanaka",
      "sponsorLevel": "Manager",
      "projectStatus": "Active",
      "goLiveDate": "2028-07-22",
      "monthsToGoLive": 30,
      "businessValue": 2,
      "regulatorySecurity": true,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 7.0,
      "costEstimateUsd": 780000,
      "dependencyCount": 4,
      "riskRating": "Low",
      "effortPersonWeeks": 72,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.72,
      "quality": 0.83,
      "modelCertainty": 0.82,
      "confidenceScore": 77.9,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 70.0,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.12,
          "direction": "decreases",
          "featureValue": 30
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 780000
        }
      ],
      "dataIssues": [
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0085",
      "projectName": "AI Model Safety, Guardrails & Governance Suite",
      "portfolio": "AI Team",
      "businessUnit": "Human Resources",
      "site": "Fremont",
      "projectManager": "Yara Gallagher",
      "executiveSponsor": "Elena Ferreira",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-03-10",
      "monthsToGoLive": 26,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 8.4,
      "costEstimateUsd": 610421,
      "dependencyCount": 2,
      "riskRating": "Medium",
      "effortPersonWeeks": 65,
      "sourcesPresent": 11,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 1.0,
      "quality": 0.89,
      "modelCertainty": 0.72,
      "confidenceScore": 90.6,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 78.3,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.2,
          "direction": "decreases",
          "featureValue": 26
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 610421
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0086",
      "projectName": "OneLake Enterprise Data Foundation & Catalog",
      "portfolio": "Data and Analytics",
      "businessUnit": "Human Resources",
      "site": "Hsinchu",
      "projectManager": "Mateo Okafor",
      "executiveSponsor": "Priya Aziz",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2027-02-20",
      "monthsToGoLive": 13,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": true,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 5.2,
      "costEstimateUsd": 6500000,
      "dependencyCount": 4,
      "riskRating": "Critical",
      "effortPersonWeeks": 169,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": true,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.68,
      "quality": 0.88,
      "modelCertainty": 0.94,
      "confidenceScore": 80.2,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R3 Protected Program",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.46,
          "direction": "increases",
          "featureValue": 13
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": [
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0087",
      "projectName": "Direct Lake Power BI Executive KPI Semantic Model",
      "portfolio": "Data and Analytics",
      "businessUnit": "Human Resources",
      "site": "Fremont",
      "projectManager": "Carlos Moreno",
      "executiveSponsor": "Noah Chen",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2027-10-16",
      "monthsToGoLive": 21,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 5.8,
      "costEstimateUsd": 867948,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 212,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.77,
      "quality": 0.88,
      "modelCertainty": 0.9,
      "confidenceScore": 83.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.04,
          "direction": "increases",
          "featureValue": 867948
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0088",
      "projectName": "Real-Time Sensor Telemetry Lakehouse Pipeline",
      "portfolio": "Data and Analytics",
      "businessUnit": "Finance and Controls",
      "site": "Tualatin",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Klaus Weber",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2026-08-25",
      "monthsToGoLive": 7,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 3.4,
      "costEstimateUsd": 1800000,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 123,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": false
      },
      "completeness": 0.52,
      "quality": 0.91,
      "modelCertainty": 0.82,
      "confidenceScore": 71.7,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 84.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.58,
          "direction": "increases",
          "featureValue": 7
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.09,
          "direction": "increases",
          "featureValue": 1800000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0089",
      "projectName": "Global Financial Performance Direct Lake Model",
      "portfolio": "Data and Analytics",
      "businessUnit": "Corporate IT",
      "site": "Global Remote",
      "projectManager": "Leila Nakamura",
      "executiveSponsor": "Priya Kowalski",
      "sponsorLevel": "Executive",
      "projectStatus": "On Hold",
      "goLiveDate": "2028-10-10",
      "monthsToGoLive": 33,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 5.9,
      "costEstimateUsd": 369588,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 150,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.52,
      "quality": 0.79,
      "modelCertainty": 0.7,
      "confidenceScore": 65.0,
      "confidenceLevel": "Medium",
      "mlTier": "Candidate to deprioritize",
      "finalTier": "Candidate to deprioritize",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.1,
        "deprioritize": 0.65
      },
      "priorityScore": 38.1,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Pause or divert skills",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.06,
          "direction": "decreases",
          "featureValue": 33
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.02,
          "direction": "increases",
          "featureValue": 369588
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0090",
      "projectName": "Customer Warranty Claims Analytics Engine",
      "portfolio": "Data and Analytics",
      "businessUnit": "Global Supply Chain",
      "site": "Hsinchu",
      "projectManager": "Elena Novak",
      "executiveSponsor": "Dmitri Nakamura",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2028-10-17",
      "monthsToGoLive": 33,
      "businessValue": 2,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 11.7,
      "costEstimateUsd": 515573,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 126,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.84,
      "quality": 0.78,
      "modelCertainty": 0.83,
      "confidenceScore": 81.7,
      "confidenceLevel": "High",
      "mlTier": "Can wait",
      "finalTier": "Can wait",
      "tierProbabilities": {
        "mustDoNow": 0.05,
        "proceed": 0.2,
        "canWait": 0.65,
        "deprioritize": 0.1
      },
      "priorityScore": 53.2,
      "ruleOverrides": [],
      "recommendedAction": "Re-sequence",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.06,
          "direction": "decreases",
          "featureValue": 33
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.03,
          "direction": "increases",
          "featureValue": 515573
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0091",
      "projectName": "Supply Chain Multi-Tier Lead-Time Analytics",
      "portfolio": "Data and Analytics",
      "businessUnit": "Human Resources",
      "site": "Hsinchu",
      "projectManager": "Tariq Aziz",
      "executiveSponsor": "Leila Iyer",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2026-09-26",
      "monthsToGoLive": 8,
      "businessValue": 3,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 6.8,
      "costEstimateUsd": 6500000,
      "dependencyCount": 4,
      "riskRating": "High",
      "effortPersonWeeks": 151,
      "sourcesPresent": 5,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": false,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.45,
      "quality": 0.76,
      "modelCertainty": 0.87,
      "confidenceScore": 64.2,
      "confidenceLevel": "Medium",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 87.1,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R5 Cross-Portfolio Critical Path"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.56,
          "direction": "increases",
          "featureValue": 8
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)",
        "High upstream dependency entanglement"
      ]
    },
    {
      "projectId": "GIS-0092",
      "projectName": "Fab Yield Variance Statistical Analytics",
      "portfolio": "Data and Analytics",
      "businessUnit": "Finance and Controls",
      "site": "Global Remote",
      "projectManager": "Sophia Patel",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Executive",
      "projectStatus": "Active",
      "goLiveDate": "2028-07-20",
      "monthsToGoLive": 30,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Project Management",
      "skillDemandFte": 2.9,
      "costEstimateUsd": 2400000,
      "dependencyCount": 0,
      "riskRating": "Medium",
      "effortPersonWeeks": 89,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.79,
      "quality": 0.85,
      "modelCertainty": 0.87,
      "confidenceScore": 82.7,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 75.8,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.12,
          "direction": "decreases",
          "featureValue": 30
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 2400000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0093",
      "projectName": "Workforce Skill Demand & Capacity Forecaster",
      "portfolio": "Data and Analytics",
      "businessUnit": "Human Resources",
      "site": "Penang",
      "projectManager": "Isabel Okafor",
      "executiveSponsor": "Victor Cruz",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2026-11-04",
      "monthsToGoLive": 10,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cloud and Infrastructure",
      "skillDemandFte": 9.5,
      "costEstimateUsd": 4800000,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 113,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.76,
      "quality": 0.75,
      "modelCertainty": 0.82,
      "confidenceScore": 76.9,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 72.5,
      "ruleOverrides": [],
      "recommendedAction": "Add capacity",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.52,
          "direction": "increases",
          "featureValue": 10
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.24,
          "direction": "decreases",
          "featureValue": 4800000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0094",
      "projectName": "Corporate ESG & Carbon Footprint Reporter",
      "portfolio": "Data and Analytics",
      "businessUnit": "Finance and Controls",
      "site": "Singapore",
      "projectManager": "Isabel Brandt",
      "executiveSponsor": "Yara Haddad",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-10-06",
      "monthsToGoLive": 21,
      "businessValue": 2,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 10.4,
      "costEstimateUsd": 1928272,
      "dependencyCount": 2,
      "riskRating": "High",
      "effortPersonWeeks": 173,
      "sourcesPresent": 6,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.58,
      "quality": 0.81,
      "modelCertainty": 0.8,
      "confidenceScore": 70.5,
      "confidenceLevel": "Medium",
      "mlTier": "Proceed",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 66.7,
      "ruleOverrides": [
        "R1 Regulatory First"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.36,
          "direction": "decreases",
          "featureValue": 2
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.3,
          "direction": "decreases",
          "featureValue": 21
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.1,
          "direction": "increases",
          "featureValue": 1928272
        }
      ],
      "dataIssues": [
        "Sparse cross-system presence (< 7 sources)"
      ]
    },
    {
      "projectId": "GIS-0095",
      "projectName": "Enterprise Master Data Lakehouse Mesh",
      "portfolio": "Data and Analytics",
      "businessUnit": "Manufacturing Engineering",
      "site": "Singapore",
      "projectManager": "Leila Patel",
      "executiveSponsor": "Ingrid Iyer",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-01-09",
      "monthsToGoLive": 12,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Unified Communications",
      "skillDemandFte": 6.4,
      "costEstimateUsd": 963900,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 36,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": false,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.69,
      "quality": 0.95,
      "modelCertainty": 0.91,
      "confidenceScore": 82.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.48,
          "direction": "increases",
          "featureValue": 12
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.05,
          "direction": "increases",
          "featureValue": 963900
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0096",
      "projectName": "IoT Fleet Telemetry Streaming with Kafka",
      "portfolio": "Data and Analytics",
      "businessUnit": "Manufacturing Engineering",
      "site": "Tualatin",
      "projectManager": "Priya Okafor",
      "executiveSponsor": "Elena Ferreira",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-12-23",
      "monthsToGoLive": 23,
      "businessValue": 4,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Application Development",
      "skillDemandFte": 1.9,
      "costEstimateUsd": 1461307,
      "dependencyCount": 1,
      "riskRating": "Critical",
      "effortPersonWeeks": 42,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": false,
        "excelIntake": true
      },
      "completeness": 0.85,
      "quality": 0.91,
      "modelCertainty": 0.82,
      "confidenceScore": 86.5,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 73.9,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.26,
          "direction": "decreases",
          "featureValue": 23
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.07,
          "direction": "increases",
          "featureValue": 1461307
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0097",
      "projectName": "Sales Pipeline Win-Rate Predictive Analytics",
      "portfolio": "Data and Analytics",
      "businessUnit": "Customer Services",
      "site": "Hsinchu",
      "projectManager": "Jordan Okafor",
      "executiveSponsor": "Nadia Al-Mansoor",
      "sponsorLevel": "Director",
      "projectStatus": "Active",
      "goLiveDate": "2026-05-09",
      "monthsToGoLive": 4,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Data Engineering",
      "skillDemandFte": 11.1,
      "costEstimateUsd": 6500000,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 127,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": false,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.6,
      "quality": 0.91,
      "modelCertainty": 0.83,
      "confidenceScore": 75.5,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 83.2,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Analytics",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.64,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0098",
      "projectName": "Procurement Spend Optimization & Anomaly Scanner",
      "portfolio": "Data and Analytics",
      "businessUnit": "Finance and Controls",
      "site": "Tualatin",
      "projectManager": "Noah Aziz",
      "executiveSponsor": "Isabel Moreno",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2026-07-22",
      "monthsToGoLive": 6,
      "businessValue": 4,
      "regulatorySecurity": true,
      "dtAlignment": false,
      "protectedProgram": true,
      "primarySkill": "Application Development",
      "skillDemandFte": 8.4,
      "costEstimateUsd": 2069198,
      "dependencyCount": 0,
      "riskRating": "Low",
      "effortPersonWeeks": 90,
      "sourcesPresent": 8,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": false,
        "ado": true,
        "jira": true,
        "msProject": true,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": false,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.73,
      "quality": 0.83,
      "modelCertainty": 0.89,
      "confidenceScore": 79.7,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [
        "R1 Regulatory First",
        "R3 Protected Program"
      ],
      "recommendedAction": "Protect slot",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.72,
          "direction": "increases",
          "featureValue": 4
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.6,
          "direction": "increases",
          "featureValue": 6
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": 0.45,
          "direction": "increases",
          "featureValue": 1
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.1,
          "direction": "decreases",
          "featureValue": 2069198
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0099",
      "projectName": "Asset Depreciation & CapEx Forecast Lakehouse",
      "portfolio": "Data and Analytics",
      "businessUnit": "Corporate IT",
      "site": "Fremont",
      "projectManager": "Isabel Okafor",
      "executiveSponsor": "Lucas Schmidt",
      "sponsorLevel": "Manager",
      "projectStatus": "Planning",
      "goLiveDate": "2026-06-03",
      "monthsToGoLive": 5,
      "businessValue": 5,
      "regulatorySecurity": false,
      "dtAlignment": true,
      "protectedProgram": false,
      "primarySkill": "Cybersecurity",
      "skillDemandFte": 11.1,
      "costEstimateUsd": 6500000,
      "dependencyCount": 1,
      "riskRating": "Medium",
      "effortPersonWeeks": 152,
      "sourcesPresent": 7,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": true,
        "jira": true,
        "msProject": false,
        "smartsheet": false,
        "buTrackers": true,
        "buRepositories": false,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": false
      },
      "completeness": 0.61,
      "quality": 0.94,
      "modelCertainty": 0.82,
      "confidenceScore": 76.8,
      "confidenceLevel": "High",
      "mlTier": "Must-do-now",
      "finalTier": "Must-do-now",
      "tierProbabilities": {
        "mustDoNow": 0.75,
        "proceed": 0.15,
        "canWait": 0.1,
        "deprioritize": 0.0
      },
      "priorityScore": 98.5,
      "ruleOverrides": [],
      "recommendedAction": "Proceed",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.9,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.62,
          "direction": "increases",
          "featureValue": 5
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.33,
          "direction": "decreases",
          "featureValue": 6500000
        }
      ],
      "dataIssues": []
    },
    {
      "projectId": "GIS-0100",
      "projectName": "Automated Executive Boardroom BI Direct Lake Pack",
      "portfolio": "Data and Analytics",
      "businessUnit": "Customer Services",
      "site": "Fremont",
      "projectManager": "Avery Romero",
      "executiveSponsor": "Ethan Novak",
      "sponsorLevel": "Executive",
      "projectStatus": "Planning",
      "goLiveDate": "2027-03-03",
      "monthsToGoLive": 14,
      "businessValue": 3,
      "regulatorySecurity": false,
      "dtAlignment": false,
      "protectedProgram": false,
      "primarySkill": "Network Engineering",
      "skillDemandFte": 10.7,
      "costEstimateUsd": 3424359,
      "dependencyCount": 0,
      "riskRating": "High",
      "effortPersonWeeks": 162,
      "sourcesPresent": 9,
      "sourcesTotal": 11,
      "sources": {
        "planview": true,
        "powerapps": true,
        "ado": false,
        "jira": true,
        "msProject": false,
        "smartsheet": true,
        "buTrackers": true,
        "buRepositories": true,
        "hrCapacity": true,
        "cost": true,
        "excelIntake": true
      },
      "completeness": 0.85,
      "quality": 0.85,
      "modelCertainty": 0.71,
      "confidenceScore": 82.2,
      "confidenceLevel": "High",
      "mlTier": "Proceed",
      "finalTier": "Proceed",
      "tierProbabilities": {
        "mustDoNow": 0.15,
        "proceed": 0.65,
        "canWait": 0.1,
        "deprioritize": 0.1
      },
      "priorityScore": 64.6,
      "ruleOverrides": [
        "R2 Executive Sponsorship"
      ],
      "recommendedAction": "Add capacity",
      "cluster": "Core IT",
      "topDrivers": [
        {
          "signalKey": "business_value",
          "signalLabel": "Business Value",
          "shapValue": 0.54,
          "direction": "increases",
          "featureValue": 3
        },
        {
          "signalKey": "timing_urgency",
          "signalLabel": "Timing Urgency",
          "shapValue": 0.44,
          "direction": "increases",
          "featureValue": 14
        },
        {
          "signalKey": "regulatory_security",
          "signalLabel": "Regulatory / Security",
          "shapValue": -0.12,
          "direction": "decreases",
          "featureValue": 0
        },
        {
          "signalKey": "cost_usd",
          "signalLabel": "Cost Magnitude",
          "shapValue": -0.17,
          "direction": "decreases",
          "featureValue": 3424359
        }
      ],
      "dataIssues": []
    }
  ],
  "capacityBySkill": [
    {
      "skill": "Application Development",
      "supplyFte": 48.0,
      "demandFte": 56.4,
      "gapFte": -8.4,
      "projectsInDemand": 26
    },
    {
      "skill": "Network Engineering",
      "supplyFte": 36.0,
      "demandFte": 32.1,
      "gapFte": 3.9,
      "projectsInDemand": 18
    },
    {
      "skill": "Cloud and Infrastructure",
      "supplyFte": 40.0,
      "demandFte": 45.8,
      "gapFte": -5.8,
      "projectsInDemand": 21
    },
    {
      "skill": "Data Engineering",
      "supplyFte": 28.0,
      "demandFte": 34.2,
      "gapFte": -6.2,
      "projectsInDemand": 15
    },
    {
      "skill": "Cybersecurity",
      "supplyFte": 24.0,
      "demandFte": 22.5,
      "gapFte": 1.5,
      "projectsInDemand": 14
    },
    {
      "skill": "Unified Communications",
      "supplyFte": 20.0,
      "demandFte": 18.2,
      "gapFte": 1.8,
      "projectsInDemand": 9
    },
    {
      "skill": "Integration (iPaaS)",
      "supplyFte": 16.0,
      "demandFte": 19.4,
      "gapFte": -3.4,
      "projectsInDemand": 11
    },
    {
      "skill": "Project Management",
      "supplyFte": 22.0,
      "demandFte": 20.1,
      "gapFte": 1.9,
      "projectsInDemand": 12
    }
  ],
  "clusters": [
    {
      "clusterId": 1,
      "name": "Platform",
      "projectCount": 32,
      "avgConfidence": 81.4
    },
    {
      "clusterId": 2,
      "name": "Analytics & AI",
      "projectCount": 28,
      "avgConfidence": 84.1
    },
    {
      "clusterId": 3,
      "name": "Security & Identity",
      "projectCount": 24,
      "avgConfidence": 79.8
    },
    {
      "clusterId": 4,
      "name": "Core Enterprise IT",
      "projectCount": 16,
      "avgConfidence": 76.5
    }
  ],
  "rules": [
    {
      "ruleId": "R1",
      "name": "Regulatory or Security First",
      "condition": "regulatory_security == True",
      "action": "Elevate to Must-do-now tier",
      "enabled": true
    },
    {
      "ruleId": "R2",
      "name": "Executive Sponsorship Protection",
      "condition": "sponsor_level == 'Executive' AND business_value >= 4",
      "action": "Guard from Candidate to deprioritize",
      "enabled": true
    },
    {
      "ruleId": "R3",
      "name": "Protected Strategic Program",
      "condition": "protected_program == True",
      "action": "Lock priority slot; prevent deferral",
      "enabled": true
    },
    {
      "ruleId": "R4",
      "name": "Deprioritize Guard on Active",
      "condition": "project_status == 'Active' AND months_to_go_live <= 6",
      "action": "Do not deprioritize without VP escalation",
      "enabled": true
    },
    {
      "ruleId": "R5",
      "name": "Cross-Portfolio Critical Path",
      "condition": "dependency_count >= 3",
      "action": "Re-sequence successors; highlight coupling",
      "enabled": true
    }
  ],
  "modelMetrics": {
    "algorithm": "LightGBM + CalibratedClassifierCV (Platt)",
    "accuracyCv": 0.914,
    "macroF1Cv": 0.892,
    "logLossCv": 0.284,
    "trainingRows": 100,
    "features": [
      "timing_urgency",
      "business_value",
      "sponsor_priority",
      "regulatory_security",
      "skill_demand",
      "cost_usd",
      "dependencies",
      "risk",
      "dt_alignment",
      "effort_person_weeks"
    ]
  }
};

export const SAMPLE_DECISIONS: LocalDecision[] = [
  {
    "projectId": "GIS-0001",
    "action": "Approve",
    "reason": "Edge network security essential for Singapore fab expansion and regulatory compliance.",
    "timestamp": "2026-10-13T10:15:00Z"
  },
  {
    "projectId": "GIS-0004",
    "action": "Approve",
    "reason": "Critical API gateway program with high sponsor backing; slot protected.",
    "timestamp": "2026-10-13T11:30:00Z"
  },
  {
    "projectId": "GIS-0007",
    "action": "Approve",
    "reason": "Endpoint hardening upgrade approved with Q4 2027 delivery target.",
    "timestamp": "2026-10-13T14:20:00Z"
  },
  {
    "projectId": "GIS-0010",
    "action": "Adjust",
    "reason": "Paused for skills reallocation to GIS-0001; adjusted tier to Can wait.",
    "timestamp": "2026-10-13T15:45:00Z"
  },
  {
    "projectId": "GIS-0014",
    "action": "Approve",
    "reason": "Privileged access management is corporate zero trust prerequisite.",
    "timestamp": "2026-10-13T16:10:00Z"
  },
  {
    "projectId": "GIS-0020",
    "action": "Approve",
    "reason": "SIEM upgrade approved under Information Security portfolio.",
    "timestamp": "2026-10-13T17:00:00Z"
  },
  {
    "projectId": "GIS-0034",
    "action": "Reject",
    "reason": "High risk, low sponsor certainty; recommended candidate for deprioritization.",
    "timestamp": "2026-10-14T08:30:00Z"
  },
  {
    "projectId": "GIS-0041",
    "action": "Approve",
    "reason": "MES yield telemetry connector aligned with Digital Transformation core goals.",
    "timestamp": "2026-10-14T09:00:00Z"
  },
  {
    "projectId": "GIS-0062",
    "action": "Approve",
    "reason": "Multi-cloud transit backbone funded; proceed immediately.",
    "timestamp": "2026-10-14T09:45:00Z"
  },
  {
    "projectId": "GIS-0076",
    "action": "Approve",
    "reason": "Wafer defect CV vision model demonstrated 98% recall; high business value.",
    "timestamp": "2026-10-14T10:15:00Z"
  },
  {
    "projectId": "GIS-0086",
    "action": "Approve",
    "reason": "OneLake enterprise data foundation approved by CIO Council.",
    "timestamp": "2026-10-14T11:00:00Z"
  },
  {
    "projectId": "GIS-0092",
    "action": "Adjust",
    "reason": "Adjusted timeline to sync with Fab Operations yield calibration cycle.",
    "timestamp": "2026-10-14T11:30:00Z"
  }
];

export const SAMPLE_OPTIONS_RESPONSE: OptionsResponse = {
  schemaVersion: 1,
  description: "Shared PMO data-entry contract",
  projectIdPattern: "^GIS-\\d{4}$",
  options: {
  "businessUnits": [
    "Semiconductor Process Equipment",
    "Fab Operations",
    "Global Supply Chain",
    "Digital Transformation",
    "Finance and Controls",
    "Human Resources",
    "Information Security",
    "Manufacturing Engineering",
    "Customer Services",
    "Corporate IT"
  ],
  "sites": [
    "Fremont",
    "Tualatin",
    "Singapore",
    "Penang",
    "Hsinchu",
    "Global Remote"
  ],
  "projectStatuses": [
    "Planning",
    "Active",
    "On Hold"
  ],
  "sponsorLevels": [
    "Executive",
    "Director",
    "Manager",
    "Individual"
  ],
  "riskRatings": [
    "Low",
    "Medium",
    "High",
    "Critical"
  ],
  "skills": [
    {
      "key": "UC",
      "displayName": "Unified Communications"
    },
    {
      "key": "NET",
      "displayName": "Network Engineering"
    },
    {
      "key": "APP",
      "displayName": "Application Development"
    },
    {
      "key": "DATA",
      "displayName": "Data Engineering"
    },
    {
      "key": "CLOUD",
      "displayName": "Cloud and Infrastructure"
    },
    {
      "key": "SEC",
      "displayName": "Cybersecurity"
    },
    {
      "key": "INT",
      "displayName": "Integration (iPaaS)"
    },
    {
      "key": "PM",
      "displayName": "Project Management"
    }
  ],
  "relationshipTypes": [
    "FinishToStart",
    "StartToStart",
    "SharedResource",
    "DataDependency",
    "SecurityGate"
  ]
},
  projectFields: [
  {
    "key": "projectName",
    "label": "Project name",
    "type": "text",
    "required": true,
    "minLength": 3,
    "maxLength": 120
  },
  {
    "key": "portfolioKey",
    "label": "Portfolio",
    "type": "select",
    "required": true,
    "source": "portfolios"
  },
  {
    "key": "programKey",
    "label": "Program",
    "type": "select",
    "required": true,
    "source": "programsOfPortfolio"
  },
  {
    "key": "businessUnit",
    "label": "Business unit",
    "type": "select",
    "required": true,
    "source": "options.businessUnits"
  },
  {
    "key": "site",
    "label": "Site",
    "type": "select",
    "required": true,
    "source": "options.sites"
  },
  {
    "key": "sponsorName",
    "label": "Executive sponsor",
    "type": "text",
    "required": true,
    "minLength": 3,
    "maxLength": 80
  },
  {
    "key": "sponsorEmail",
    "label": "Sponsor email",
    "type": "email",
    "required": false
  },
  {
    "key": "projectManager",
    "label": "Project manager",
    "type": "text",
    "required": false,
    "maxLength": 80
  },
  {
    "key": "projectStatus",
    "label": "Status",
    "type": "select",
    "required": true,
    "source": "options.projectStatuses"
  },
  {
    "key": "goLiveDate",
    "label": "Go-live date",
    "type": "date",
    "required": true,
    "minDate": "2026-01-01",
    "maxDate": "2032-12-31"
  },
  {
    "key": "businessValue",
    "label": "Business value estimate (1 to 5)",
    "type": "integer",
    "required": true,
    "min": 1,
    "max": 5
  },
  {
    "key": "userBase",
    "label": "User base (number of users)",
    "type": "integer",
    "required": true,
    "min": 0,
    "max": 100000000
  },
  {
    "key": "estimatedAnnualBenefitUsd",
    "label": "Estimated annual benefit (USD)",
    "type": "number",
    "required": false,
    "min": 0,
    "max": 10000000000
  },
  {
    "key": "sponsorLevel",
    "label": "Sponsor level",
    "type": "select",
    "required": true,
    "source": "options.sponsorLevels"
  },
  {
    "key": "regulatorySecurity",
    "label": "Regulatory or security driven",
    "type": "boolean",
    "required": true
  },
  {
    "key": "dtAlignment",
    "label": "Digital transformation aligned",
    "type": "boolean",
    "required": true
  },
  {
    "key": "protectedProgram",
    "label": "Protected program",
    "type": "boolean",
    "required": false
  },
  {
    "key": "primarySkill",
    "label": "Primary skill",
    "type": "select",
    "required": true,
    "source": "options.skills"
  },
  {
    "key": "skillDemandFte",
    "label": "Skill demand (FTE)",
    "type": "number",
    "required": true,
    "min": 0.5,
    "max": 12
  },
  {
    "key": "costEstimateUsd",
    "label": "Cost estimate (USD)",
    "type": "number",
    "required": true,
    "min": 10000,
    "max": 100000000
  },
  {
    "key": "dependencies",
    "label": "Dependencies",
    "type": "dependencyList",
    "required": false,
    "maxItems": 10
  },
  {
    "key": "riskRating",
    "label": "Risk rating",
    "type": "select",
    "required": true,
    "source": "options.riskRatings"
  },
  {
    "key": "effortPersonWeeks",
    "label": "Effort (person-weeks)",
    "type": "number",
    "required": true,
    "min": 1,
    "max": 2000
  },
  {
    "key": "notes",
    "label": "Notes",
    "type": "text",
    "required": false,
    "maxLength": 1000
  }
],
  portfolioFields: [
    { key: "key", label: "Portfolio Key", type: "string", required: true },
    { key: "displayName", label: "Display Name", type: "string", required: true },
    { key: "code", label: "Code", type: "string", required: true },
    { key: "role", label: "Role", type: "select", options: ["main", "coupled"], required: true }
  ],
  uploads: {
  "maxFilesPerSourcePerProject": 5,
  "maxFileBytes": 10485760,
  "acceptedBySource": {
    "planview": {
      "extensions": [
        ".csv",
        ".xlsx"
      ]
    },
    "ado": {
      "extensions": [
        ".csv"
      ]
    },
    "jira": {
      "extensions": [
        ".json"
      ]
    },
    "ms_project": {
      "extensions": [
        ".xml"
      ]
    },
    "smartsheet": {
      "extensions": [
        ".csv"
      ]
    },
    "excel_intake": {
      "extensions": [
        ".xlsx"
      ]
    }
  }
},
  quickAdd: {
    limits: {
      maxProjectNameChars: 120,
      minDescriptionChars: 20,
      maxDescriptionChars: 4000,
      maxDocuments: 5,
      maxDocumentBytes: 10485760,
      acceptedDocumentExtensions: [".docx", ".pdf", ".txt", ".xlsx", ".pptx"]
    },
    evidenceLevels: ["Explicit", "Inferred", "Default"]
  }
};

export const SAMPLE_PORTFOLIOS: PortfolioItem[] = [
  {
    "key": "it-infosec",
    "displayName": "IT InfoSec",
    "code": "INFOSEC",
    "role": "main",
    "programs": [
      {
        "key": "zero-trust-identity",
        "name": "Zero Trust and Identity"
      },
      {
        "key": "security-operations",
        "name": "Security Operations"
      },
      {
        "key": "cloud-endpoint-security",
        "name": "Cloud and Endpoint Security"
      },
      {
        "key": "governance-compliance",
        "name": "Governance and Compliance"
      }
    ]
  },
  {
    "key": "it-software-development",
    "displayName": "IT Software Development",
    "code": "SWDEV",
    "role": "coupled",
    "programs": [
      {
        "key": "application-platform",
        "name": "Application Platform"
      },
      {
        "key": "integration-apis",
        "name": "Integration and APIs"
      }
    ]
  },
  {
    "key": "it-infrastructure",
    "displayName": "IT Infrastructure",
    "code": "INFRA",
    "role": "coupled",
    "programs": [
      {
        "key": "network-collaboration",
        "name": "Network and Collaboration"
      },
      {
        "key": "datacenter-cloud",
        "name": "Datacenter and Cloud"
      }
    ]
  },
  {
    "key": "ai-team",
    "displayName": "AI Team",
    "code": "AI",
    "role": "coupled",
    "programs": [
      {
        "key": "ai-platform",
        "name": "AI Platform and Copilots"
      }
    ]
  },
  {
    "key": "data-analytics",
    "displayName": "Data and Analytics",
    "code": "DATA",
    "role": "coupled",
    "programs": [
      {
        "key": "data-platform",
        "name": "Data Platform and Lakehouse"
      }
    ]
  }
];
