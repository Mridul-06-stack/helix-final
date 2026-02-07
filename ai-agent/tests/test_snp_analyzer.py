"""
Tests for SNP Analyzer
"""

import pytest
from agent.snp_analyzer import SNPAnalyzer, GeneFileFormat, SNPResult


# Sample 23andMe format data
SAMPLE_23ANDME_DATA = """# rsid	chromosome	position	genotype
rs12913832	15	28365618	GG
rs4988235	2	136608646	CT
rs1815739	11	66560624	CC
rs762551	15	75041917	AA
rs671	12	112241766	GG
rs713598	7	141972804	GG
rs17822931	16	48258198	CT
rs72921001	11	6890295	CC
rs2282679	4	72618334	AG
"""

# Sample Ancestry format data
SAMPLE_ANCESTRY_DATA = """rsID	chromosome	position	allele1	allele2
rs12913832	15	28365618	G	G
rs4988235	2	136608646	C	T
rs1815739	11	66560624	C	C
"""


class TestSNPAnalyzer:
    """Tests for the SNP Analyzer"""
    
    def setup_method(self):
        """Set up test analyzer"""
        self.analyzer = SNPAnalyzer()
    
    def teardown_method(self):
        """Clean up after each test"""
        self.analyzer.clear_data()
    
    def test_detect_23andme_format(self):
        """Test detection of 23andMe file format"""
        format_type = self.analyzer.detect_format(SAMPLE_23ANDME_DATA)
        assert format_type == GeneFileFormat.TWENTY_THREE_AND_ME
    
    def test_detect_ancestry_format(self):
        """Test detection of Ancestry file format"""
        format_type = self.analyzer.detect_format(SAMPLE_ANCESTRY_DATA)
        assert format_type == GeneFileFormat.ANCESTRY
    
    def test_parse_23andme_file(self):
        """Test parsing 23andMe format data"""
        count = self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        assert count == 9  # Should parse 9 SNPs
    
    def test_lookup_existing_snp(self):
        """Test looking up an SNP that exists"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        result = self.analyzer.lookup_snp("rs12913832")
        
        assert result.found == True
        assert result.rsid == "rs12913832"
        assert result.chromosome == "15"
        assert result.genotype == "GG"
        assert result.gene == "HERC2"
        assert result.trait == "eye_color"
    
    def test_lookup_nonexistent_snp(self):
        """Test looking up an SNP that doesn't exist"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        result = self.analyzer.lookup_snp("rs99999999")
        
        assert result.found == False
        assert result.genotype == ""
    
    def test_check_snp_match_exact(self):
        """Test checking for exact genotype match"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        # Should match GG
        matches, genotype = self.analyzer.check_snp_match("rs12913832", "GG")
        assert matches == True
        assert genotype == "GG"
        
        # Should not match AA
        matches, genotype = self.analyzer.check_snp_match("rs12913832", "AA")
        assert matches == False
    
    def test_predict_eye_color(self):
        """Test eye color prediction"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        prediction = self.analyzer.predict_trait("eye_color")
        
        assert prediction is not None
        assert prediction.trait == "eye_color"
        assert prediction.prediction == "blue"  # GG = blue eyes
        assert prediction.confidence > 0.5
    
    def test_predict_lactose_tolerance(self):
        """Test lactose tolerance prediction"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        prediction = self.analyzer.predict_trait("lactose_tolerance")
        
        assert prediction is not None
        assert prediction.trait == "lactose_tolerance"
        assert prediction.prediction == "likely_tolerant"  # CT genotype
    
    def test_predict_muscle_type(self):
        """Test muscle type prediction"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        prediction = self.analyzer.predict_trait("muscle_type")
        
        assert prediction is not None
        assert prediction.prediction == "power_athlete"  # CC genotype
    
    def test_predict_caffeine_metabolism(self):
        """Test caffeine metabolism prediction"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        prediction = self.analyzer.predict_trait("caffeine_metabolism")
        
        assert prediction is not None
        assert prediction.prediction == "fast_metabolizer"  # AA genotype
    
    def test_predict_unknown_trait(self):
        """Test predicting an unknown trait"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        prediction = self.analyzer.predict_trait("unknown_trait")
        
        assert prediction is None
    
    def test_analyze_for_bounty_snp_check(self):
        """Test bounty analysis for SNP_CHECK"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        result = self.analyzer.analyze_for_bounty("SNP_CHECK", {
            "rsid": "rs12913832"
        })
        
        assert result["query_type"] == "SNP_CHECK"
        assert result["found"] == True
    
    def test_analyze_for_bounty_trait_query(self):
        """Test bounty analysis for TRAIT_QUERY"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        result = self.analyzer.analyze_for_bounty("TRAIT_QUERY", {
            "trait": "eye_color"
        })
        
        assert result["query_type"] == "TRAIT_QUERY"
        assert result["found"] == True
        assert result["prediction"] == "blue"
    
    def test_analyze_for_bounty_variant_search(self):
        """Test bounty analysis for VARIANT_SEARCH"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        result = self.analyzer.analyze_for_bounty("VARIANT_SEARCH", {
            "rsids": ["rs12913832", "rs4988235", "rs99999999"]
        })
        
        assert result["query_type"] == "VARIANT_SEARCH"
        assert result["total_found"] == 2  # 2 out of 3 found
    
    def test_get_available_traits(self):
        """Test getting list of available traits"""
        traits = self.analyzer.get_available_traits()
        
        assert "eye_color" in traits
        assert "lactose_tolerance" in traits
        assert "muscle_type" in traits
    
    def test_clear_data(self):
        """Test clearing data from memory"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        assert self.analyzer.lookup_snp("rs12913832").found == True
        
        self.analyzer.clear_data()
        
        assert self.analyzer.lookup_snp("rs12913832").found == False
    
    def test_case_insensitive_rsid(self):
        """Test that rsID lookup is case-insensitive"""
        self.analyzer.parse_file(SAMPLE_23ANDME_DATA)
        
        result1 = self.analyzer.lookup_snp("rs12913832")
        result2 = self.analyzer.lookup_snp("RS12913832")
        result3 = self.analyzer.lookup_snp("Rs12913832")
        
        assert result1.found == result2.found == result3.found == True
        assert result1.genotype == result2.genotype == result3.genotype


class TestSNPDatabase:
    """Tests for the SNP database"""
    
    def test_snp_database_structure(self):
        """Test that SNP database has required fields"""
        analyzer = SNPAnalyzer()
        
        for rsid, info in analyzer.SNP_DATABASE.items():
            assert "gene" in info
            assert "trait" in info
            assert "variants" in info or "clinical" in info
    
    def test_trait_snps_mapping(self):
        """Test that trait-to-SNP mapping is valid"""
        analyzer = SNPAnalyzer()
        
        for trait, snps in analyzer.TRAIT_SNPS.items():
            assert len(snps) > 0
            for snp in snps:
                assert snp.lower() in analyzer.SNP_DATABASE


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
