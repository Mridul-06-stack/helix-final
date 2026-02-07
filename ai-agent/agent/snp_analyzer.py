"""
SNP Analyzer - Genetic Variant Analysis Engine
Analyzes raw genetic data files for SNP (Single Nucleotide Polymorphism) variants.
Supports 23andMe, Ancestry, and standard VCF formats.
"""

import re
import gzip
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class GeneFileFormat(Enum):
    """Supported genetic file formats"""
    TWENTY_THREE_AND_ME = "23andme"
    ANCESTRY = "ancestry"
    VCF = "vcf"
    UNKNOWN = "unknown"


@dataclass
class SNPResult:
    """Result of an SNP lookup"""
    rsid: str
    chromosome: str
    position: int
    genotype: str
    found: bool
    gene: Optional[str] = None
    trait: Optional[str] = None
    interpretation: Optional[str] = None


@dataclass
class TraitPrediction:
    """Prediction for a genetic trait"""
    trait: str
    prediction: str
    confidence: float
    supporting_snps: List[SNPResult]
    description: str


class SNPAnalyzer:
    """
    Analyzes raw genetic data files for SNP variants.
    
    This is the core analysis engine that runs in a secure environment.
    It never exposes raw genetic data - only returns specific query results.
    """
    
    # Comprehensive SNP → Trait database
    # Each entry contains gene info, trait, and genotype interpretations
    SNP_DATABASE: Dict[str, Dict] = {
        # Eye Color
        "rs12913832": {
            "gene": "HERC2",
            "trait": "eye_color",
            "chromosome": "15",
            "variants": {
                "GG": {"prediction": "blue", "confidence": 0.85},
                "AG": {"prediction": "green_hazel", "confidence": 0.70},
                "AA": {"prediction": "brown", "confidence": 0.90}
            },
            "description": "Primary determinant of blue vs brown eye color"
        },
        "rs1800407": {
            "gene": "OCA2",
            "trait": "eye_color",
            "chromosome": "15",
            "variants": {
                "CC": {"prediction": "brown_modifier", "confidence": 0.60},
                "CT": {"prediction": "mixed", "confidence": 0.50},
                "TT": {"prediction": "blue_modifier", "confidence": 0.65}
            },
            "description": "Secondary eye color modifier"
        },
        
        # Lactose Tolerance
        "rs4988235": {
            "gene": "MCM6",
            "trait": "lactose_tolerance",
            "chromosome": "2",
            "variants": {
                "TT": {"prediction": "lactose_tolerant", "confidence": 0.95},
                "CT": {"prediction": "likely_tolerant", "confidence": 0.75},
                "CC": {"prediction": "lactose_intolerant", "confidence": 0.90}
            },
            "description": "European lactase persistence variant"
        },
        
        # Muscle Type / Athletic Performance
        "rs1815739": {
            "gene": "ACTN3",
            "trait": "muscle_type",
            "chromosome": "11",
            "variants": {
                "CC": {"prediction": "power_athlete", "confidence": 0.70},
                "CT": {"prediction": "mixed", "confidence": 0.60},
                "TT": {"prediction": "endurance_athlete", "confidence": 0.65}
            },
            "description": "Alpha-actinin-3 - fast-twitch muscle fiber protein"
        },
        
        # Caffeine Metabolism
        "rs762551": {
            "gene": "CYP1A2",
            "trait": "caffeine_metabolism",
            "chromosome": "15",
            "variants": {
                "AA": {"prediction": "fast_metabolizer", "confidence": 0.80},
                "AC": {"prediction": "moderate_metabolizer", "confidence": 0.65},
                "CC": {"prediction": "slow_metabolizer", "confidence": 0.75}
            },
            "description": "Caffeine metabolism speed"
        },
        
        # Alcohol Flush Reaction
        "rs671": {
            "gene": "ALDH2",
            "trait": "alcohol_flush",
            "chromosome": "12",
            "variants": {
                "GG": {"prediction": "normal", "confidence": 0.95},
                "AG": {"prediction": "mild_flush", "confidence": 0.85},
                "AA": {"prediction": "severe_flush", "confidence": 0.95}
            },
            "description": "Alcohol flush reaction (Asian glow)"
        },
        
        # Bitter Taste Perception
        "rs713598": {
            "gene": "TAS2R38",
            "trait": "bitter_taste",
            "chromosome": "7",
            "variants": {
                "CC": {"prediction": "non_taster", "confidence": 0.80},
                "CG": {"prediction": "medium_taster", "confidence": 0.70},
                "GG": {"prediction": "super_taster", "confidence": 0.85}
            },
            "description": "Ability to taste bitter compounds like PTC"
        },
        
        # Vitamin D Levels
        "rs2282679": {
            "gene": "GC",
            "trait": "vitamin_d",
            "chromosome": "4",
            "variants": {
                "AA": {"prediction": "higher_levels", "confidence": 0.65},
                "AG": {"prediction": "normal_levels", "confidence": 0.55},
                "GG": {"prediction": "lower_levels", "confidence": 0.70}
            },
            "description": "Vitamin D binding protein variant"
        },
        
        # BRCA1 - Cancer Risk (Clinical - requires special handling)
        "rs80357906": {
            "gene": "BRCA1",
            "trait": "brca1_status",
            "chromosome": "17",
            "clinical": True,
            "variants": {
                "normal": {"prediction": "no_variant", "confidence": 0.99},
                "variant": {"prediction": "variant_detected", "confidence": 0.99}
            },
            "description": "BRCA1 pathogenic variant - consult genetic counselor"
        },
        
        # Cilantro Taste
        "rs72921001": {
            "gene": "OR6A2",
            "trait": "cilantro_taste",
            "chromosome": "11",
            "variants": {
                "CC": {"prediction": "tastes_normal", "confidence": 0.70},
                "CT": {"prediction": "slightly_soapy", "confidence": 0.60},
                "TT": {"prediction": "tastes_like_soap", "confidence": 0.80}
            },
            "description": "Cilantro soapy taste perception"
        },
        
        # Earwax Type
        "rs17822931": {
            "gene": "ABCC11",
            "trait": "earwax_type",
            "chromosome": "16",
            "variants": {
                "CC": {"prediction": "wet_earwax", "confidence": 0.95},
                "CT": {"prediction": "wet_earwax", "confidence": 0.90},
                "TT": {"prediction": "dry_earwax", "confidence": 0.95}
            },
            "description": "Earwax type - also affects body odor"
        }
    }
    
    # Trait to SNPs mapping
    TRAIT_SNPS: Dict[str, List[str]] = {
        "eye_color": ["rs12913832", "rs1800407"],
        "lactose_tolerance": ["rs4988235"],
        "muscle_type": ["rs1815739"],
        "caffeine_metabolism": ["rs762551"],
        "alcohol_flush": ["rs671"],
        "bitter_taste": ["rs713598"],
        "vitamin_d": ["rs2282679"],
        "cilantro_taste": ["rs72921001"],
        "earwax_type": ["rs17822931"],
        "brca1_status": ["rs80357906"]
    }
    
    def __init__(self):
        """Initialize the SNP Analyzer"""
        self._parsed_data: Dict[str, Tuple[str, int, str]] = {}
        self._file_format: GeneFileFormat = GeneFileFormat.UNKNOWN
        
    def detect_format(self, content: str) -> GeneFileFormat:
        """
        Detect the format of the genetic data file.
        
        Args:
            content: Raw file content (first few lines)
            
        Returns:
            Detected file format
        """
        lines = content.strip().split('\n')[:20]
        
        for line in lines:
            # 23andMe format: # rsid chromosome position genotype
            if line.startswith('# rsid') or 'chromosome\tposition\tgenotype' in line.lower():
                return GeneFileFormat.TWENTY_THREE_AND_ME
            
            # Ancestry format
            if 'rsID\tchromosome\tposition\tallele1\tallele2' in line:
                return GeneFileFormat.ANCESTRY
            
            # VCF format
            if line.startswith('##fileformat=VCF'):
                return GeneFileFormat.VCF
                
        # Try to detect by content pattern
        for line in lines:
            if line.startswith('#'):
                continue
            parts = line.split('\t')
            if len(parts) >= 4 and parts[0].startswith('rs'):
                return GeneFileFormat.TWENTY_THREE_AND_ME
                
        return GeneFileFormat.UNKNOWN
    
    def parse_file(self, content: str) -> int:
        """
        Parse genetic data file into searchable format.
        
        Args:
            content: Raw file content
            
        Returns:
            Number of SNPs parsed
        """
        self._parsed_data.clear()
        self._file_format = self.detect_format(content)
        
        lines = content.strip().split('\n')
        
        for line in lines:
            if line.startswith('#') or not line.strip():
                continue
                
            try:
                if self._file_format == GeneFileFormat.TWENTY_THREE_AND_ME:
                    parts = line.split('\t')
                    if len(parts) >= 4:
                        rsid = parts[0].strip().lower()
                        chromosome = parts[1].strip()
                        position = int(parts[2].strip())
                        genotype = parts[3].strip().upper()
                        self._parsed_data[rsid] = (chromosome, position, genotype)
                        
                elif self._file_format == GeneFileFormat.ANCESTRY:
                    parts = line.split('\t')
                    if len(parts) >= 5:
                        rsid = parts[0].strip().lower()
                        chromosome = parts[1].strip()
                        position = int(parts[2].strip())
                        genotype = (parts[3] + parts[4]).strip().upper()
                        self._parsed_data[rsid] = (chromosome, position, genotype)
                        
                elif self._file_format == GeneFileFormat.VCF:
                    parts = line.split('\t')
                    if len(parts) >= 10 and parts[2].startswith('rs'):
                        rsid = parts[2].strip().lower()
                        chromosome = parts[0].strip().replace('chr', '')
                        position = int(parts[1].strip())
                        # Parse genotype from VCF format
                        ref = parts[3]
                        alt = parts[4]
                        gt_field = parts[9].split(':')[0]
                        genotype = self._vcf_genotype_to_string(ref, alt, gt_field)
                        self._parsed_data[rsid] = (chromosome, position, genotype)
                        
            except (ValueError, IndexError) as e:
                logger.debug(f"Skipping malformed line: {line[:50]}... Error: {e}")
                continue
                
        logger.info(f"Parsed {len(self._parsed_data)} SNPs from {self._file_format.value} format file")
        return len(self._parsed_data)
    
    def _vcf_genotype_to_string(self, ref: str, alt: str, gt: str) -> str:
        """Convert VCF genotype notation to allele string"""
        alleles = [ref] + alt.split(',')
        try:
            indices = gt.replace('|', '/').split('/')
            return ''.join(alleles[int(i)] for i in indices if i != '.')
        except (ValueError, IndexError):
            return "??"
    
    def lookup_snp(self, rsid: str) -> SNPResult:
        """
        Look up a specific SNP in the parsed data.
        
        Args:
            rsid: The rsID to look up (e.g., "rs12913832")
            
        Returns:
            SNPResult with the variant information
        """
        rsid_lower = rsid.lower()
        
        if rsid_lower not in self._parsed_data:
            return SNPResult(
                rsid=rsid,
                chromosome="",
                position=0,
                genotype="",
                found=False
            )
        
        chromosome, position, genotype = self._parsed_data[rsid_lower]
        
        # Get additional info from our database
        db_info = self.SNP_DATABASE.get(rsid_lower, {})
        
        result = SNPResult(
            rsid=rsid,
            chromosome=chromosome,
            position=position,
            genotype=genotype,
            found=True,
            gene=db_info.get("gene"),
            trait=db_info.get("trait")
        )
        
        # Add interpretation if available
        if db_info and "variants" in db_info:
            variant_info = db_info["variants"].get(genotype, {})
            result.interpretation = variant_info.get("prediction")
            
        return result
    
    def check_snp_match(self, rsid: str, target_genotype: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Check if a specific SNP exists and optionally matches a target genotype.
        
        This is the main function used for bounty queries.
        Returns only boolean + genotype (privacy-preserving).
        
        Args:
            rsid: The rsID to check
            target_genotype: Optional specific genotype to match
            
        Returns:
            Tuple of (exists/matches, genotype if found)
        """
        result = self.lookup_snp(rsid)
        
        if not result.found:
            return (False, None)
            
        if target_genotype:
            # Normalize genotypes for comparison (e.g., "AG" == "GA")
            target_sorted = ''.join(sorted(target_genotype.upper()))
            actual_sorted = ''.join(sorted(result.genotype.upper()))
            matches = target_sorted == actual_sorted
            return (matches, result.genotype)
            
        return (True, result.genotype)
    
    def predict_trait(self, trait: str) -> Optional[TraitPrediction]:
        """
        Predict a trait based on known SNP markers.
        
        Args:
            trait: The trait to predict (e.g., "eye_color", "lactose_tolerance")
            
        Returns:
            TraitPrediction with the prediction and supporting evidence
        """
        if trait not in self.TRAIT_SNPS:
            logger.warning(f"Unknown trait: {trait}")
            return None
            
        snp_ids = self.TRAIT_SNPS[trait]
        supporting_snps: List[SNPResult] = []
        predictions: List[Tuple[str, float]] = []
        
        for rsid in snp_ids:
            result = self.lookup_snp(rsid)
            if result.found:
                supporting_snps.append(result)
                
                # Get prediction from database
                db_info = self.SNP_DATABASE.get(rsid.lower(), {})
                if "variants" in db_info and result.genotype in db_info["variants"]:
                    variant_info = db_info["variants"][result.genotype]
                    predictions.append((
                        variant_info["prediction"],
                        variant_info["confidence"]
                    ))
        
        if not predictions:
            return None
            
        # Use the prediction with highest confidence
        predictions.sort(key=lambda x: x[1], reverse=True)
        best_prediction, confidence = predictions[0]
        
        # Get description from primary SNP
        primary_snp = self.SNP_DATABASE.get(snp_ids[0].lower(), {})
        description = primary_snp.get("description", "")
        
        return TraitPrediction(
            trait=trait,
            prediction=best_prediction,
            confidence=confidence,
            supporting_snps=supporting_snps,
            description=description
        )
    
    def get_available_traits(self) -> List[str]:
        """Get list of traits that can be predicted"""
        return list(self.TRAIT_SNPS.keys())
    
    def get_snp_info(self, rsid: str) -> Optional[Dict]:
        """Get database information about an SNP"""
        return self.SNP_DATABASE.get(rsid.lower())
    
    def analyze_for_bounty(self, query_type: str, params: Dict) -> Dict:
        """
        Run analysis for a bounty query.
        
        This is the main entry point for bounty responses.
        Returns only the minimum information needed.
        
        Args:
            query_type: Type of query (SNP_CHECK, TRAIT_QUERY, etc.)
            params: Query parameters
            
        Returns:
            Dict with result and any proof data
        """
        if query_type == "SNP_CHECK":
            rsid = params.get("rsid")
            target_genotype = params.get("genotype")
            
            if not rsid:
                return {"error": "Missing rsid parameter"}
                
            found, genotype = self.check_snp_match(rsid, target_genotype)
            
            return {
                "query_type": query_type,
                "rsid": rsid,
                "found": found,
                "matches": found if not target_genotype else (genotype == target_genotype if genotype else False),
                # Don't expose actual genotype for privacy
                "has_variant": found
            }
            
        elif query_type == "TRAIT_QUERY":
            trait = params.get("trait")
            
            if not trait:
                return {"error": "Missing trait parameter"}
                
            prediction = self.predict_trait(trait)
            
            if not prediction:
                return {
                    "query_type": query_type,
                    "trait": trait,
                    "found": False
                }
                
            return {
                "query_type": query_type,
                "trait": trait,
                "found": True,
                "prediction": prediction.prediction,
                "confidence": prediction.confidence,
                # Don't expose supporting SNP details
            }
            
        elif query_type == "VARIANT_SEARCH":
            rsids = params.get("rsids", [])
            results = {}
            
            for rsid in rsids:
                found, _ = self.check_snp_match(rsid)
                results[rsid] = found
                
            return {
                "query_type": query_type,
                "results": results,
                "total_found": sum(1 for v in results.values() if v)
            }
            
        else:
            return {"error": f"Unknown query type: {query_type}"}
    
    def clear_data(self):
        """Clear all parsed data from memory (for security)"""
        self._parsed_data.clear()
        self._file_format = GeneFileFormat.UNKNOWN
        logger.info("Cleared all genetic data from memory")
